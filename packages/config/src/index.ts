import { config as loadDotenv } from "dotenv";
import { z } from "zod";

// .env faylini yuklaymiz (monorepo root'dan ham, joriy katalogdan ham).
loadDotenv();

// Dev uchun ruxsat etilgan default qiymatlar — productionда RAD etiladi.
export const DEV_PLATFORM_SECRET = "dev-only-change-me-please-32bytes-min";
export const DEV_ADMIN_TOKEN = "dev-admin-token-change-me";

// To'g'ri env boolean parser ("false"/"0"/"no"/"off" -> false).
// (z.coerce.boolean() har qanday bo'sh bo'lmagan matnni true qiladi — xato.)
function envBool(def: boolean) {
  return z.preprocess((v) => {
    if (v === undefined || v === null) return def;
    if (typeof v === "boolean") return v;
    const s = String(v).toLowerCase().trim();
    return !(s === "false" || s === "0" || s === "no" || s === "off" || s === "");
  }, z.boolean());
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgres://shahzod@localhost:5432/platform"),
  PROJECTS_DATABASE_URL: z
    .string()
    .url()
    .default("postgres://shahzod@localhost:5432/postgres"),
  GATEWAY_PORT: z.coerce.number().int().positive().default(8000),
  GATEWAY_HOST: z.string().default("0.0.0.0"),
  PLATFORM_SECRET: z
    .string()
    .min(16, "PLATFORM_SECRET kamida 16 belgidan iborat bo'lishi kerak")
    .default(DEV_PLATFORM_SECRET),
  // Storage (Phase 3) — fayllar saqlanadigan local katalog.
  STORAGE_DIR: z.string().default("./storage-data"),
  // Admin endpointlar (dashboard) uchun token (Phase 5).
  PLATFORM_ADMIN_TOKEN: z.string().default(DEV_ADMIN_TOKEN),
  // CORS: vergul bilan ajratilgan domenlar; "*" = hammasi (faqat dev uchun).
  GATEWAY_CORS_ORIGINS: z.string().default("*"),
  // SQL statement timeout (ms) — og'ir so'rovlarni to'xtatadi.
  STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  // ── Email / SMTP (Auth: tasdiqlash + parol tiklash) ──
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: envBool(false),
  SMTP_FROM: z.string().default("storagedb <no-reply@localhost>"),
  // Email havolalaridagi bazaviy URL (bo'sh bo'lsa so'rov host'idan olinadi).
  AUTH_SITE_URL: z.string().default(""),
  // true: signup avtomatik tasdiqlanadi (email kerak emas). false: tasdiqlash talab qilinadi.
  AUTH_AUTOCONFIRM: envBool(true),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export type AppConfig = z.infer<typeof envSchema>;

let cached: AppConfig | null = null;

/**
 * Productionда zaif/default secretlarni rad etadi.
 * (Dev/test'da ruxsat — qulaylik uchun.)
 */
function assertProductionSafe(cfg: AppConfig): void {
  if (cfg.NODE_ENV !== "production") return;
  const problems: string[] = [];
  if (cfg.PLATFORM_SECRET === DEV_PLATFORM_SECRET) {
    problems.push("PLATFORM_SECRET hali default — `openssl rand -hex 32` bilan o'zgartiring");
  }
  if (cfg.PLATFORM_ADMIN_TOKEN === DEV_ADMIN_TOKEN) {
    problems.push("PLATFORM_ADMIN_TOKEN hali default — uni o'zgartiring");
  }
  if (cfg.GATEWAY_CORS_ORIGINS === "*") {
    problems.push("GATEWAY_CORS_ORIGINS='*' productionда xavfli — domenlaringizni ko'rsating");
  }
  if (problems.length > 0) {
    throw new Error(
      "Production xavfsizlik tekshiruvi muvaffaqiyatsiz:\n" +
        problems.map((p) => `  - ${p}`).join("\n"),
    );
  }
}

/** Validatsiyalangan, keshlangan konfiguratsiyani qaytaradi. */
export function getConfig(): AppConfig {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Konfiguratsiya xatosi (env):\n${issues}`);
  }
  assertProductionSafe(parsed.data);
  cached = parsed.data;
  return cached;
}
