import { createHmac, timingSafeEqual } from "node:crypto";
import { getConfig } from "@storagedb/config";
import { getProjectPool } from "@storagedb/db";
import type { Project, ProjectContext } from "@storagedb/types";
import { putFile, getFile, removeFile } from "./backend.js";

export class StorageError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

interface Bucket {
  id: string;
  public: boolean;
}
interface ObjectRow {
  bucket_id: string;
  name: string;
  owner: string | null;
  size: number;
  mime_type: string | null;
}

async function asService<T>(
  project: Project,
  fn: (tx: import("@storagedb/db").Sql) => Promise<T>,
): Promise<T> {
  const pool = getProjectPool(project);
  return pool.begin(async (tx) => {
    await tx.unsafe(`set local role "service_role"`);
    return fn(tx as unknown as import("@storagedb/db").Sql);
  }) as Promise<T>;
}

async function loadBucket(
  project: Project,
  id: string,
): Promise<Bucket | null> {
  return asService(project, async (tx) => {
    const [b] = await tx<Bucket[]>`
      select id, public from storage.buckets where id = ${id}
    `;
    return b ?? null;
  });
}

function requireWrite(ctx: ProjectContext): void {
  if (ctx.role !== "authenticated" && ctx.role !== "service_role") {
    throw new StorageError(403, "Yuklash uchun authenticated yoki service kerak");
  }
}

// ── Bucketlar ──────────────────────────────────────────────────────────
export async function createBucket(
  project: Project,
  ctx: ProjectContext,
  id: string,
  isPublic = false,
): Promise<Bucket> {
  if (ctx.role !== "service_role") {
    throw new StorageError(403, "Bucket yaratish uchun service_role kerak");
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id)) {
    throw new StorageError(400, "Bucket id yaroqsiz");
  }
  return asService(project, async (tx) => {
    const [b] = await tx<Bucket[]>`
      insert into storage.buckets (id, public) values (${id}, ${isPublic})
      on conflict (id) do update set public = excluded.public
      returning id, public
    `;
    return b!;
  });
}

export async function listBuckets(project: Project): Promise<Bucket[]> {
  return asService(
    project,
    (tx) => tx<Bucket[]>`select id, public from storage.buckets order by id`,
  );
}

// ── Obyektlar ──────────────────────────────────────────────────────────
export async function uploadObject(
  project: Project,
  ctx: ProjectContext,
  bucket: string,
  name: string,
  data: Buffer,
  mime: string | null,
): Promise<ObjectRow> {
  requireWrite(ctx);
  const b = await loadBucket(project, bucket);
  if (!b) throw new StorageError(404, `Bucket topilmadi: ${bucket}`);

  await putFile(project.ref, bucket, name, data);
  const owner = ctx.claims.sub ?? null;
  return asService(project, async (tx) => {
    const [obj] = await tx<ObjectRow[]>`
      insert into storage.objects (bucket_id, name, owner, size, mime_type)
      values (${bucket}, ${name}, ${owner}, ${data.length}, ${mime})
      on conflict (bucket_id, name) do update
        set size = excluded.size, mime_type = excluded.mime_type, updated_at = now()
      returning bucket_id, name, owner, size, mime_type
    `;
    return obj!;
  });
}

async function loadObject(
  project: Project,
  bucket: string,
  name: string,
): Promise<ObjectRow | null> {
  return asService(project, async (tx) => {
    const [o] = await tx<ObjectRow[]>`
      select bucket_id, name, owner, size, mime_type
      from storage.objects where bucket_id = ${bucket} and name = ${name}
    `;
    return o ?? null;
  });
}

/** Maxfiy obyektga kirish huquqi: service, yoki egasi. */
function canAccess(ctx: ProjectContext, obj: ObjectRow): boolean {
  if (ctx.role === "service_role") return true;
  if (obj.owner && ctx.claims.sub === obj.owner) return true;
  return false;
}

export interface DownloadResult {
  data: Buffer;
  mime: string;
  size: number;
}

export async function downloadObject(
  project: Project,
  ctx: ProjectContext,
  bucket: string,
  name: string,
): Promise<DownloadResult> {
  const b = await loadBucket(project, bucket);
  if (!b) throw new StorageError(404, `Bucket topilmadi: ${bucket}`);
  const obj = await loadObject(project, bucket, name);
  if (!obj) throw new StorageError(404, "Obyekt topilmadi");

  if (!b.public && !canAccess(ctx, obj)) {
    throw new StorageError(403, "Bu obyektga kirish taqiqlangan");
  }
  return readFromDisk(project, bucket, name, obj);
}

/** Common: diskdan o'qib DownloadResult qaytaradi. */
async function readFromDisk(
  project: Project,
  bucket: string,
  name: string,
  obj: ObjectRow,
): Promise<DownloadResult> {
  const data = await getFile(project.ref, bucket, name);
  if (!data) throw new StorageError(404, "Fayl diskda yo'q");
  return {
    data,
    mime: obj.mime_type ?? "application/octet-stream",
    size: obj.size,
  };
}

/** Ommaviy bucketdan autentifikatsiyasiz yuklab olish. */
export async function downloadPublic(
  project: Project,
  bucket: string,
  name: string,
): Promise<DownloadResult> {
  const b = await loadBucket(project, bucket);
  if (!b || !b.public) throw new StorageError(404, "Ommaviy bucket topilmadi");
  const obj = await loadObject(project, bucket, name);
  if (!obj) throw new StorageError(404, "Obyekt topilmadi");
  return readFromDisk(project, bucket, name, obj);
}

export async function deleteObject(
  project: Project,
  ctx: ProjectContext,
  bucket: string,
  name: string,
): Promise<void> {
  const obj = await loadObject(project, bucket, name);
  if (!obj) throw new StorageError(404, "Obyekt topilmadi");
  if (!canAccess(ctx, obj)) {
    throw new StorageError(403, "O'chirish taqiqlangan");
  }
  await removeFile(project.ref, bucket, name);
  await asService(project, async (tx) => {
    await tx`delete from storage.objects where bucket_id = ${bucket} and name = ${name}`;
  });
}

// ── Signed URL (HMAC) ──────────────────────────────────────────────────
function signPayload(ref: string, bucket: string, name: string, exp: number): string {
  return createHmac("sha256", getConfig().PLATFORM_SECRET)
    .update(`${ref}:${bucket}:${name}:${exp}`)
    .digest("hex");
}

/** Maxfiy obyektga vaqtinchalik signed token yaratadi (egasi/service). */
export async function createSignedToken(
  project: Project,
  ctx: ProjectContext,
  bucket: string,
  name: string,
  expiresInSec = 3600,
): Promise<{ token: string; expiresAt: number }> {
  const obj = await loadObject(project, bucket, name);
  if (!obj) throw new StorageError(404, "Obyekt topilmadi");
  if (!canAccess(ctx, obj)) {
    throw new StorageError(403, "Signed URL yaratish taqiqlangan");
  }
  const exp = Math.floor(epochNow() / 1000) + expiresInSec;
  const sig = signPayload(project.ref, bucket, name, exp);
  return { token: `${exp}.${sig}`, expiresAt: exp };
}

/** Signed token bilan yuklab olish (autentifikatsiyasiz). */
export async function downloadSigned(
  project: Project,
  bucket: string,
  name: string,
  token: string,
): Promise<DownloadResult> {
  const [expStr, sig] = token.split(".");
  const exp = Number.parseInt(expStr ?? "", 10);
  if (!sig || Number.isNaN(exp)) throw new StorageError(403, "Token yaroqsiz");
  if (exp < Math.floor(epochNow() / 1000)) {
    throw new StorageError(403, "Token muddati o'tgan");
  }
  const expected = signPayload(project.ref, bucket, name, exp);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new StorageError(403, "Imzo noto'g'ri");
  }
  const obj = await loadObject(project, bucket, name);
  if (!obj) throw new StorageError(404, "Obyekt topilmadi");
  return readFromDisk(project, bucket, name, obj);
}

// new Date()/Date.now() to'g'ridan-to'g'ri ishlatishdan saqlanish uchun wrapper.
function epochNow(): number {
  return Date.now();
}
