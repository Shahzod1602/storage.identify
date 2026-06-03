import type { FastifyInstance, FastifyRequest } from "fastify";
import { getConfig } from "@storagedb/config";
import {
  listProjects,
  getProjectByRef,
  createProject,
  getProjectPool,
} from "@storagedb/db";
import { generateProjectKeys } from "@storagedb/jwt";
import { resolveContext, GatewayError } from "./context.js";

function requireAdmin(req: FastifyRequest): void {
  const token = req.headers["x-admin-token"];
  if (token !== getConfig().PLATFORM_ADMIN_TOKEN) {
    throw new GatewayError(401, "Admin token kerak (x-admin-token)");
  }
}

export function registerAdminRoutes(app: FastifyInstance): void {
  // Loyihalar ro'yxati (maxfiy maydonlarsiz)
  app.get("/admin/projects", async (req, reply) => {
    requireAdmin(req);
    const projects = await listProjects();
    return reply.send(
      projects.map((p) => ({
        ref: p.ref,
        name: p.name,
        db_name: p.dbName,
        created_at: p.createdAt,
      })),
    );
  });

  // Yangi loyiha yaratish
  app.post("/admin/projects", async (req, reply) => {
    requireAdmin(req);
    const { name } = (req.body ?? {}) as { name?: string };
    if (!name) throw new GatewayError(400, "name kerak");
    const { project, keys } = await createProject({ name });
    return reply.code(201).send({
      ref: project.ref,
      name: project.name,
      anon_key: keys.anonKey,
      service_key: keys.serviceKey,
    });
  });

  // Loyiha kalitlarini olish (jwt_secret'dan qayta hosil qilinadi)
  app.get("/admin/projects/:ref/keys", async (req, reply) => {
    requireAdmin(req);
    const { ref } = req.params as { ref: string };
    const project = await getProjectByRef(ref);
    if (!project) throw new GatewayError(404, "Loyiha topilmadi");
    const keys = await generateProjectKeys(project.jwtSecret, ref);
    return reply.send({
      ref,
      name: project.name,
      anon_key: keys.anonKey,
      service_key: keys.serviceKey,
      api_url: `/v1/${ref}`,
    });
  });

  // Meta SQL — ixtiyoriy SQL'ni service_role rolida bajaradi (DDL + query).
  // Faqat service_key bilan (apikey: service_key).
  app.post("/v1/:ref/meta/query", async (req, reply) => {
    const { ref } = req.params as { ref: string };
    const ctx = await resolveContext(req, ref);
    if (ctx.role !== "service_role") {
      throw new GatewayError(403, "meta/query uchun service_role kerak");
    }
    const { query } = (req.body ?? {}) as { query?: string };
    if (!query) throw new GatewayError(400, "query kerak");

    const pool = getProjectPool(ctx.project);
    try {
      const rows = await pool.begin(async (tx) => {
        await tx.unsafe(`set local role "service_role"`);
        return tx.unsafe(query);
      });
      return reply.send({ rows: rows ?? [] });
    } catch (err) {
      return reply
        .code(400)
        .send({ error: err instanceof Error ? err.message : "SQL xatosi" });
    }
  });
}
