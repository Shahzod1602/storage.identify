import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { getConfig } from "@storagedb/config";
import {
  createProject,
  closeAll,
  closeProjectPools,
  runMigrations,
} from "@storagedb/db";
import { RestHttpError } from "@storagedb/rest";
import { AuthError } from "@storagedb/auth";
import { StorageError } from "@storagedb/storage";
import { resolveContext, GatewayError } from "./context.js";
import { registerRestRoutes } from "./rest.js";
import { registerAuthRoutes } from "./auth.js";
import { registerStorageRoutes } from "./storage.js";
import { registerRealtime, hub } from "./realtime.js";
import { registerAdminRoutes, seedSuperAdmin } from "./admin.js";
import {
  recordRequest,
  metricsText,
  metricsContentType,
  startMetricsCollector,
  stopMetricsCollector,
} from "./metrics.js";

const cfg = getConfig();

const app = Fastify({
  logger: { level: cfg.LOG_LEVEL },
  bodyLimit: 52_428_800, // 50 MB (fayl yuklash uchun)
});

// CORS: "*" => hamma origin (dev); aks holda env'dagi domenlar ro'yxati.
const corsOrigin =
  cfg.GATEWAY_CORS_ORIGINS === "*"
    ? true
    : cfg.GATEWAY_CORS_ORIGINS.split(",").map((o) => o.trim());
await app.register(cors, {
  origin: corsOrigin,
  exposedHeaders: ["content-range"], // SDK pagination total'ni o'qiy olsin
});

// Xavfsizlik headerlari (API uchun CSP o'chirilgan).
await app.register(helmet, { contentSecurityPolicy: false });

// Rate limiting — har (IP + apikey) bo'yicha alohida. Shunday qilib bir loyiha
// abuse'i boshqa loyihalarga ta'sir qilmaydi.
await app.register(rateLimit, {
  max: 300,
  timeWindow: "1 minute",
  keyGenerator: (req) => {
    const apikey = req.headers["apikey"];
    const key = Array.isArray(apikey) ? apikey[0] : apikey;
    return `${req.ip}:${key ?? "anon"}`;
  },
});

// Binary (fayl) yuklash uchun: JSON'dan boshqa hamma content-type'ni Buffer qiladi.
app.addContentTypeParser(
  "*",
  { parseAs: "buffer" },
  (_req, body, done) => done(null, body),
);

// Har so'rovni o'lchaymiz (Prometheus + Reports uchun).
app.addHook("onResponse", (req, reply, done) => {
  recordRequest(req.url, reply.statusCode, reply.elapsedTime);
  done();
});

// Sog'liq tekshiruvi
app.get("/health", async () => ({ status: "ok", service: "gateway" }));

// Prometheus metrikalari (ichki tarmoq — productionда tashqariga chiqarilmaydi).
app.get("/metrics", async (_req, reply) => {
  reply.header("content-type", metricsContentType);
  return reply.send(await metricsText());
});

// ── Control-plane: yangi loyiha yaratish ───────────────────────────────
const createProjectBody = z.object({
  name: z.string().min(1).max(64),
  ownerEmail: z.string().email().optional(),
});

app.post("/v1/projects", async (req, reply) => {
  const parsed = createProjectBody.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: parsed.error.flatten() });
  }
  const { project, keys } = await createProject(parsed.data);
  return reply.code(201).send({
    ref: project.ref,
    name: project.name,
    db_name: project.dbName,
    // Bu kalitlar FAQAT shu javobda qaytadi — saqlab qo'ying.
    anon_key: keys.anonKey,
    service_key: keys.serviceKey,
    // Misol uchun foydalanish URL'i:
    api_url: `http://${req.headers.host}/v1/${project.ref}`,
  });
});

// ── REST API (Phase 1): /v1/:ref/rest/v1/:table ────────────────────────
registerRestRoutes(app);

// ── Auth (Phase 2): /v1/:ref/auth/v1/* ─────────────────────────────────
registerAuthRoutes(app);

// ── Storage (Phase 3): /v1/:ref/storage/v1/* ───────────────────────────
registerStorageRoutes(app);

// ── Realtime (Phase 4): WS /v1/:ref/realtime/v1/websocket ──────────────
await registerRealtime(app);

// ── Admin + Meta (Phase 5 dashboard uchun) ─────────────────────────────
registerAdminRoutes(app);

// ── Boshqa loyiha yo'llari (auth/storage/realtime keyingi Phase'larda) ──
app.all("/v1/:ref/*", async (req, reply) => {
  const { ref } = req.params as { ref: string };
  const ctx = await resolveContext(req, ref);
  const wildcard = (req.params as Record<string, string>)["*"] ?? "";

  return reply.send({
    message: "Loyiha konteksti hal qilindi (Phase 0).",
    project_ref: ctx.project.ref,
    db_name: ctx.project.dbName,
    role: ctx.role,
    path: `/${wildcard}`,
    note: "Phase 1'da bu so'rov REST servisiga yo'naltiriladi.",
  });
});

// ── Xatolarni boshqarish ───────────────────────────────────────────────
app.setErrorHandler((err, _req, reply) => {
  if (err instanceof GatewayError) {
    return reply.code(err.statusCode).send({ error: err.message });
  }
  if (err instanceof RestHttpError) {
    return reply
      .code(err.status)
      .send({ error: err.message, code: err.code });
  }
  if (err instanceof AuthError || err instanceof StorageError) {
    return reply.code(err.status).send({ error: err.message });
  }
  app.log.error(err);
  return reply.code(500).send({ error: "Ichki server xatosi" });
});

// ── Ishga tushirish / to'xtatish ───────────────────────────────────────
async function shutdown() {
  app.log.info("To'xtatilmoqda...");
  stopMetricsCollector();
  await hub.close();
  await app.close();
  await closeProjectPools();
  await closeAll();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Boshlanishida control-plane migratsiyalarini bajaramiz (idempotent).
runMigrations()
  .then(() => seedSuperAdmin()) // birinchi super admin
  .then(() => {
    startMetricsCollector(); // per-loyiha DB gauge yig'uvchi
    return app.listen({ port: cfg.GATEWAY_PORT, host: cfg.GATEWAY_HOST });
  })
  .then((addr) => app.log.info(`Gateway tayyor: ${addr}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
