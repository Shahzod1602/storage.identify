import type { FastifyInstance, FastifyRequest } from "fastify";
import { getProjectByRef } from "@storagedb/db";
import type { Project } from "@storagedb/types";
import {
  createBucket,
  listBuckets,
  uploadObject,
  downloadObject,
  downloadPublic,
  downloadSigned,
  deleteObject,
  createSignedToken,
  StorageError,
} from "@storagedb/storage";
import { resolveContext, GatewayError } from "./context.js";

async function projectOr404(ref: string): Promise<Project> {
  const p = await getProjectByRef(ref);
  if (!p) throw new GatewayError(404, `Loyiha topilmadi: ${ref}`);
  return p;
}

function objectName(req: FastifyRequest): string {
  const name = (req.params as Record<string, string>)["*"];
  if (!name) throw new GatewayError(400, "Obyekt yo'li kerak");
  return name;
}

export function registerStorageRoutes(app: FastifyInstance): void {
  // Bucket yaratish (service_role)
  app.post("/v1/:ref/storage/v1/bucket", async (req, reply) => {
    const { ref } = req.params as { ref: string };
    const ctx = await resolveContext(req, ref);
    const { id, public: isPublic } = (req.body ?? {}) as {
      id?: string;
      public?: boolean;
    };
    if (!id) throw new GatewayError(400, "bucket 'id' kerak");
    const bucket = await createBucket(ctx.project, ctx, id, Boolean(isPublic));
    return reply.code(201).send(bucket);
  });

  // Bucketlar ro'yxati
  app.get("/v1/:ref/storage/v1/bucket", async (req, reply) => {
    const { ref } = req.params as { ref: string };
    await resolveContext(req, ref);
    return reply.send(await listBuckets(await projectOr404(ref)));
  });

  // Signed URL yaratish (egasi/service)
  app.post("/v1/:ref/storage/v1/object/sign/:bucket/*", async (req, reply) => {
    const { ref, bucket } = req.params as { ref: string; bucket: string };
    const ctx = await resolveContext(req, ref);
    const { expiresIn } = (req.body ?? {}) as { expiresIn?: number };
    const result = await createSignedToken(
      ctx.project,
      ctx,
      bucket,
      objectName(req),
      expiresIn ?? 3600,
    );
    const path = `/v1/${ref}/storage/v1/signed/${bucket}/${objectName(req)}`;
    return reply.send({ signedUrl: `${path}?token=${result.token}`, ...result });
  });

  // Obyekt yuklash (authenticated/service) — xom (binary) tana
  app.post("/v1/:ref/storage/v1/object/:bucket/*", async (req, reply) => {
    const { ref, bucket } = req.params as { ref: string; bucket: string };
    const ctx = await resolveContext(req, ref);
    const data = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === "string" ? req.body : "");
    if (data.length === 0) throw new GatewayError(400, "Bo'sh fayl");
    const mime = (req.headers["content-type"] as string) ?? null;
    const obj = await uploadObject(ctx.project, ctx, bucket, objectName(req), data, mime);
    return reply.code(201).send({ Key: `${bucket}/${objectName(req)}`, ...obj });
  });

  // Maxfiy obyekt yuklab olish (auth)
  app.get("/v1/:ref/storage/v1/object/:bucket/*", async (req, reply) => {
    const { ref, bucket } = req.params as { ref: string; bucket: string };
    const ctx = await resolveContext(req, ref);
    const r = await downloadObject(ctx.project, ctx, bucket, objectName(req));
    return reply.header("content-type", r.mime).send(r.data);
  });

  // Obyekt o'chirish
  app.delete("/v1/:ref/storage/v1/object/:bucket/*", async (req, reply) => {
    const { ref, bucket } = req.params as { ref: string; bucket: string };
    const ctx = await resolveContext(req, ref);
    await deleteObject(ctx.project, ctx, bucket, objectName(req));
    return reply.code(204).send();
  });

  // Ommaviy obyekt (autentifikatsiyasiz)
  app.get("/v1/:ref/storage/v1/public/:bucket/*", async (req, reply) => {
    const { ref, bucket } = req.params as { ref: string; bucket: string };
    const r = await downloadPublic(await projectOr404(ref), bucket, objectName(req));
    return reply.header("content-type", r.mime).send(r.data);
  });

  // Signed URL bilan yuklab olish (autentifikatsiyasiz)
  app.get("/v1/:ref/storage/v1/signed/:bucket/*", async (req, reply) => {
    const { ref, bucket } = req.params as { ref: string; bucket: string };
    const token = (req.query as { token?: string }).token;
    if (!token) throw new GatewayError(400, "token kerak");
    const r = await downloadSigned(await projectOr404(ref), bucket, objectName(req), token);
    return reply.header("content-type", r.mime).send(r.data);
  });
}

export { StorageError };
