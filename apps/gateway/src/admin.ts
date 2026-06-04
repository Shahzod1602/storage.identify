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
  type PlatformClaims,
} from "@storagedb/jwt";
import { resolveContext, GatewayError } from "./context.js";
import { metricsSummary } from "./metrics.js";
import {
  introspectSchema,
  buildOpenApi,
  generateTypes,
  swaggerHtml,
} from "./meta-spec.js";
import {
  verifyPlatformLogin,
  listPlatformUsers,
  createPlatformUser,
  deletePlatformUser,
} from "./platform-users.js";

export { seedSuperAdmin } from "./platform-users.js";

// ── Platforma auth (super_admin | user) ──
async function getAuthUser(req: FastifyRequest): Promise<PlatformClaims | null> {
  const cfg = getConfig();
  // Master kalit (CI/favqulodda) -> super admin
  if (req.headers["x-admin-token"] === cfg.PLATFORM_ADMIN_TOKEN) {
    return { sub: "master", role: "super_admin", email: "master" };
  }
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    return verifyPlatformToken(cfg.PLATFORM_SECRET, auth.slice(7).trim());
  }
  return null;
}

async function requireAuth(req: FastifyRequest): Promise<PlatformClaims> {
  const u = await getAuthUser(req);
  if (!u) throw new GatewayError(401, "Login kerak");
  return u;
}

async function requireSuperAdmin(req: FastifyRequest): Promise<PlatformClaims> {
  const u = await requireAuth(req);
  if (u.role !== "super_admin") {
    throw new GatewayError(403, "Super admin huquqi kerak");
  }
  return u;
}

/** Loyihaga kirish: super admin -> hammasi; user -> faqat o'ziniki. */
async function ensureProjectAccess(
  req: FastifyRequest,
  ref: string,
): Promise<PlatformClaims> {
  const u = await requireAuth(req);
  if (u.role === "super_admin") return u;
  const p = await getProjectByRef(ref);
  if (!p || p.ownerId !== u.sub) {
    throw new GatewayError(403, "Bu loyihaga ruxsat yo'q");
  }
  return u;
}

function ownerIdOf(u: PlatformClaims): string | undefined {
  return u.sub && u.sub !== "master" ? u.sub : undefined;
}

export function registerAdminRoutes(app: FastifyInstance): void {
  // ── Login: email + parol -> sessiya JWT (24s) ──
  app.post("/admin/login", async (req, reply) => {
    const { email, password } = (req.body ?? {}) as {
      email?: string;
      password?: string;
    };
    const user = await verifyPlatformLogin(email ?? "", password ?? "");
    if (!user) throw new GatewayError(401, "Email yoki parol noto'g'ri");
    const token = await signPlatformToken(getConfig().PLATFORM_SECRET, {
      sub: user.id,
      role: user.role,
      email: user.email,
    });
    return reply.send({ token, expires_in: 86400, user });
  });

  // Joriy foydalanuvchi (dashboard role'ni bilishi uchun)
  app.get("/admin/me", async (req, reply) => {
    const u = await requireAuth(req);
    return reply.send({ email: u.email, role: u.role });
  });

  // ── Foydalanuvchilar boshqaruvi (faqat super admin) ──
  app.get("/admin/users", async (req, reply) => {
    await requireSuperAdmin(req);
    return reply.send(await listPlatformUsers());
  });
  app.post("/admin/users", async (req, reply) => {
    await requireSuperAdmin(req);
    const b = (req.body ?? {}) as {
      email?: string;
      password?: string;
      role?: "user" | "super_admin";
    };
    const user = await createPlatformUser(
      b.email ?? "",
      b.password ?? "",
      b.role === "super_admin" ? "super_admin" : "user",
    );
    return reply.code(201).send(user);
  });
  app.delete("/admin/users/:id", async (req, reply) => {
    await requireSuperAdmin(req);
    await deletePlatformUser((req.params as { id: string }).id);
    return reply.code(204).send();
  });

  // ── Metrikalar (o'z loyihalari bo'yicha) ──
  app.get("/admin/metrics", async (req, reply) => {
    const u = await requireAuth(req);
    const all = await metricsSummary();
    if (u.role === "super_admin") return reply.send(all);
    const myRefs = new Set((await listProjects(u.sub)).map((p) => p.ref));
    return reply.send(all.filter((m) => myRefs.has(m.ref)));
  });

  // ── Loyihalar ── (super admin: hammasi; user: o'ziniki)
  app.get("/admin/projects", async (req, reply) => {
    const u = await requireAuth(req);
    const projects = await listProjects(
      u.role === "super_admin" ? undefined : u.sub,
    );
    return reply.send(
      projects.map((p) => ({
        ref: p.ref,
        name: p.name,
        db_name: p.dbName,
        created_at: p.createdAt,
      })),
    );
  });

  app.post("/admin/projects", async (req, reply) => {
    const u = await requireAuth(req);
    const { name } = (req.body ?? {}) as { name?: string };
    if (!name) throw new GatewayError(400, "name kerak");
    const { project, keys } = await createProject({
      name,
      ownerId: ownerIdOf(u),
    });
    return reply.code(201).send({
      ref: project.ref,
      name: project.name,
      anon_key: keys.anonKey,
      service_key: keys.serviceKey,
    });
  });

  app.get("/admin/projects/:ref/keys", async (req, reply) => {
    const { ref } = req.params as { ref: string };
    await ensureProjectAccess(req, ref);
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

  app.get("/admin/projects/:ref/types", async (req, reply) => {
    const { ref } = req.params as { ref: string };
    await ensureProjectAccess(req, ref);
    const project = await getProjectByRef(ref);
    if (!project) throw new GatewayError(404, "Loyiha topilmadi");
    const tables = await introspectSchema(project);
    return reply
      .header("content-type", "text/plain; charset=utf-8")
      .send(generateTypes(tables));
  });

  // ── OpenAPI / Swagger (loyiha apikey bilan) ──
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

  app.get("/v1/:ref/docs", async (req, reply) => {
    const { ref } = req.params as { ref: string };
    const apikey = (req.query as { apikey?: string }).apikey ?? "";
    const specUrl = `/v1/${ref}/openapi.json?apikey=${encodeURIComponent(apikey)}`;
    return reply.header("content-type", "text/html").send(swaggerHtml(specUrl));
  });

  // ── Meta SQL (service_key bilan, loyiha-scoped) ──
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
