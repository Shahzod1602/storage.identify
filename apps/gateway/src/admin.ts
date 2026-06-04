import type { FastifyInstance, FastifyRequest } from "fastify";
import { getConfig } from "@storagedb/config";
import {
  listProjects,
  getProjectByRef,
  createProject,
  getProjectPool,
} from "@storagedb/db";
import {
  generateProjectKeys,
  verifyJwt,
  signPlatformToken,
  verifyPlatformToken,
} from "@storagedb/jwt";
import { resolveContext, GatewayError } from "./context.js";
import { metricsSummary } from "./metrics.js";
import {
  introspectSchema,
  buildOpenApi,
  generateTypes,
  swaggerHtml,
} from "./meta-spec.js";

/**
 * Admin huquqini tekshiradi: x-admin-token (master kalit) YOKI
 * Authorization: Bearer <platform sessiya token> (dashboard login'dan).
 */
async function requireAdmin(req: FastifyRequest): Promise<void> {
  const cfg = getConfig();
  const staticToken = req.headers["x-admin-token"];
  if (staticToken === cfg.PLATFORM_ADMIN_TOKEN) return;

  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (await verifyPlatformToken(cfg.PLATFORM_SECRET, token)) return;
  }
  throw new GatewayError(401, "Admin huquqi kerak (login qiling)");
}

export function registerAdminRoutes(app: FastifyInstance): void {
  // Dashboard login: parol -> sessiya JWT (24 soat).
  app.post("/admin/login", async (req, reply) => {
    const { password } = (req.body ?? {}) as { password?: string };
    if (!password || password !== getConfig().PLATFORM_ADMIN_TOKEN) {
      throw new GatewayError(401, "Parol noto'g'ri");
    }
    const token = await signPlatformToken(getConfig().PLATFORM_SECRET, "24h");
    return reply.send({ token, expires_in: 86400 });
  });
  // Monitoring: per-loyiha metrikalar (studio Reports sahifasi uchun)
  app.get("/admin/metrics", async (req, reply) => {
    await requireAdmin(req);
    return reply.send(await metricsSummary());
  });

  // Loyihalar ro'yxati (maxfiy maydonlarsiz)
  app.get("/admin/projects", async (req, reply) => {
    await requireAdmin(req);
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
    await requireAdmin(req);
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
    await requireAdmin(req);
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

  // OpenAPI spec (apikey: header yoki ?apikey=)
  app.get("/v1/:ref/openapi.json", async (req, reply) => {
    const { ref } = req.params as { ref: string };
    const project = await getProjectByRef(ref);
    if (!project) throw new GatewayError(404, "Loyiha topilmadi");
    const q = req.query as { apikey?: string };
    const key = (req.headers["apikey"] as string) ?? q.apikey;
    try {
      await verifyJwt(project.jwtSecret, key ?? "");
    } catch {
      throw new GatewayError(401, "apikey kerak");
    }
    const tables = await introspectSchema(project);
    const serverUrl = `${req.protocol}://${req.headers.host}/v1/${ref}/rest/v1`;
    return reply.send(buildOpenApi(tables, ref, serverUrl));
  });

  // Swagger UI: /v1/:ref/docs?apikey=<anon>
  app.get("/v1/:ref/docs", async (req, reply) => {
    const { ref } = req.params as { ref: string };
    const apikey = (req.query as { apikey?: string }).apikey ?? "";
    const specUrl = `/v1/${ref}/openapi.json?apikey=${encodeURIComponent(apikey)}`;
    return reply.header("content-type", "text/html").send(swaggerHtml(specUrl));
  });

  // Auto TypeScript tiplar (admin)
  app.get("/admin/projects/:ref/types", async (req, reply) => {
    await requireAdmin(req);
    const { ref } = req.params as { ref: string };
    const project = await getProjectByRef(ref);
    if (!project) throw new GatewayError(404, "Loyiha topilmadi");
    const tables = await introspectSchema(project);
    return reply
      .header("content-type", "text/plain; charset=utf-8")
      .send(generateTypes(tables));
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
