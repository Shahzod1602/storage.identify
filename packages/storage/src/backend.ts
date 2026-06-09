import { mkdir, readFile, writeFile, rm, rename } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";
import { getConfig } from "@storagedb/config";

/**
 * Disk backend: fayllar STORAGE_DIR/<ref>/<bucket>/<path> ko'rinishida saqlanadi.
 * Keyinchalik S3 backend shu interfeysni amalga oshiradi.
 */

/** Path traversal ('..') hujumlaridan himoya. */
function safeKey(...parts: string[]): string {
  const joined = normalize(join(...parts));
  if (joined.split(sep).includes("..")) {
    throw new Error("Yaroqsiz yo'l");
  }
  return joined;
}

function fullPath(ref: string, bucket: string, name: string): string {
  return join(getConfig().STORAGE_DIR, safeKey(ref, bucket, name));
}

export async function putFile(
  ref: string,
  bucket: string,
  name: string,
  data: Buffer,
): Promise<void> {
  const path = fullPath(ref, bucket, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
}

export async function getFile(
  ref: string,
  bucket: string,
  name: string,
): Promise<Buffer | null> {
  try {
    return await readFile(fullPath(ref, bucket, name));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function removeFile(
  ref: string,
  bucket: string,
  name: string,
): Promise<void> {
  await rm(fullPath(ref, bucket, name), { force: true });
}

/** Bucket katalogini barcha fayllari bilan o'chiradi. */
export async function removeBucketDir(ref: string, bucket: string): Promise<void> {
  await rm(join(getConfig().STORAGE_DIR, safeKey(ref, bucket)), {
    recursive: true,
    force: true,
  });
}

/** Bucket katalogini yangi nomga ko'chiradi (katalog hali yo'q bo'lsa — jim o'tadi). */
export async function renameBucketDir(
  ref: string,
  from: string,
  to: string,
): Promise<void> {
  const base = getConfig().STORAGE_DIR;
  try {
    await rename(join(base, safeKey(ref, from)), join(base, safeKey(ref, to)));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
