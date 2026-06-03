import { getProjectPool } from "@storagedb/db";
import type { Project, ProjectContext } from "@storagedb/types";
import {
  buildSelect,
  buildInsert,
  buildUpdate,
  buildDelete,
  parseFilters,
  parseOrder,
  quoteIdent,
} from "@storagedb/sql-builder";
import { RestHttpError, toHttpError } from "./errors.js";

export { RestHttpError, toHttpError } from "./errors.js";

// Phase 1: faqat `public` schema ochiq.
const SCHEMA = "public";

export interface RestInput {
  method: string;
  table: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  /** Prefer header (masalan "return=representation"). */
  prefer?: string;
}

export interface RestResult {
  status: number;
  body: unknown;
}

function clampInt(
  raw: string | string[] | undefined,
  fallback: number | undefined,
): number | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null) return fallback;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return n;
}

function asRows(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  if (body && typeof body === "object")
    return [body as Record<string, unknown>];
  throw new RestHttpError(400, "JSON tana (obyekt yoki massiv) kerak");
}

/**
 * Loyihaning DB'sida REST so'rovini bajaradi.
 * Har so'rov bitta tranzaksiyada:
 *   1. SET LOCAL ROLE <anon|authenticated|service_role>
 *   2. set_config('request.jwt.claims', <jwt>, true)
 *   3. CRUD so'rovi -> Postgres RLS avtomatik nazorat qiladi.
 */
export async function executeRest(
  project: Project,
  ctx: ProjectContext,
  input: RestInput,
): Promise<RestResult> {
  const pool = getProjectPool(project);
  const claimsJson = JSON.stringify(ctx.claims);
  const method = input.method.toUpperCase();

  try {
    return await pool.begin(async (tx) => {
      // 1 + 2: rol va JWT claim'larni tranzaksiyaga o'rnatamiz.
      await tx.unsafe(`set local role ${quoteIdent(ctx.role)}`);
      await tx.unsafe(`select set_config('request.jwt.claims', $1, true)`, [
        claimsJson,
      ]);

      // 3: metodga qarab so'rov.
      if (method === "GET") {
        const q = buildSelect({
          schema: SCHEMA,
          table: input.table,
          select: firstString(input.query.select),
          filters: parseFilters(input.query),
          order: parseOrder(input.query.order),
          limit: clampInt(input.query.limit, undefined),
          offset: clampInt(input.query.offset, undefined),
        });
        const rows = await tx.unsafe(q.text, q.params as never[]);
        return { status: 200, body: rows };
      }

      if (method === "POST") {
        const q = buildInsert({
          schema: SCHEMA,
          table: input.table,
          rows: asRows(input.body),
          returning: true,
        });
        const rows = await tx.unsafe(q.text, q.params as never[]);
        return { status: 201, body: rows };
      }

      if (method === "PATCH" || method === "PUT") {
        const set = input.body;
        if (!set || typeof set !== "object" || Array.isArray(set)) {
          throw new RestHttpError(400, "Update uchun JSON obyekt kerak");
        }
        const q = buildUpdate({
          schema: SCHEMA,
          table: input.table,
          set: set as Record<string, unknown>,
          filters: parseFilters(input.query),
          returning: true,
        });
        const rows = await tx.unsafe(q.text, q.params as never[]);
        return { status: 200, body: rows };
      }

      if (method === "DELETE") {
        const q = buildDelete({
          schema: SCHEMA,
          table: input.table,
          filters: parseFilters(input.query),
          returning: true,
        });
        const rows = await tx.unsafe(q.text, q.params as never[]);
        return { status: 200, body: rows };
      }

      throw new RestHttpError(405, `Qo'llab-quvvatlanmaydigan metod: ${method}`);
    });
  } catch (err) {
    throw toHttpError(err);
  }
}

function firstString(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}
