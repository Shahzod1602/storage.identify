import { config as loadDotenv } from "dotenv";
import { z } from "zod";

// .env faylini yuklaymiz (monorepo root'dan ham, joriy katalogdan ham).
loadDotenv();

const envSchema = z.object({
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
    .default("dev-only-change-me-please-32bytes-min"),
  // Storage (Phase 3) — fayllar saqlanadigan local katalog.
  STORAGE_DIR: z.string().default("./storage-data"),
  // Admin endpointlar (dashboard) uchun token (Phase 5).
  PLATFORM_ADMIN_TOKEN: z.string().default("dev-admin-token-change-me"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export type AppConfig = z.infer<typeof envSchema>;

let cached: AppConfig | null = null;

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
  cached = parsed.data;
  return cached;
}
