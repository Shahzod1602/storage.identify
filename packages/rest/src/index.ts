import { getProjectPool } from "@storagedb/db";
import type { Project, ProjectContext } from "@storagedb/types";
import {
  buildSelect,
  buildCount,
  buildInsert,
  buildUpdate,
  buildDelete,
  parseFilters,
  parseOrder,
  parseSelectWithEmbeds,
  quoteIdent,
  type ResolvedEmbed,
  type EmbedSpec,
} from "@storagedb/sql-builder";
import { RestHttpError, toHttpError } from "./errors.js";

export { RestHttpError, toHttpError } from "./errors.js";

// Phase 1: faqat `public` schema ochiq.
const SCHEMA = "public";

// FK introspeksiya keshlanadi: project.ref:base:rel -> ResolvedEmbed (select'siz)
const embedCache = new Map<string, Omit<ResolvedEmbed, "select">>();

const FK_QUERY = `
  select kcu.column_name as fk_col, ccu.column_name as ref_col
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.constraint_schema = kcu.constraint_schema
  join information_schema.constraint_column_usage ccu
    on tc.constraint_name = ccu.constraint_name and tc.constraint_schema = ccu.constraint_schema
  where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
    and tc.table_name = $1 and ccu.table_name = $2
  limit 1
`;

// Ustun tiplari keshlanadi: project.ref:table -> {col: udt_name}
const colTypeCache = new Map<string, Record<string, string>>();

/** Jadval ustunlarining Postgres tiplarini (udt_name) qaytaradi. */
async function getColumnTypes(
  project: Project,
  table: string,
): Promise<Record<string, string>> {
  const key = `${project.ref}:${table}`;
  const cached = colTypeCache.get(key);
  if (cached) return cached;
  const pool = getProjectPool(project);
  const rows = (await pool.begin(async (tx) => {
    await tx.unsafe(`set local role "service_role"`);
    return tx.unsafe(
      `select column_name, udt_name from information_schema.columns
       where table_schema = 'public' and table_name = $1`,
      [table] as never[],
    );
  })) as { column_name: string; udt_name: string }[];
  const map: Record<string, string> = {};
  for (const r of rows) map[r.column_name] = r.udt_name;
  colTypeCache.set(key, map);
  return map;
}

/** base va embed jadval orasidagi FK'ni aniqlaydi (to-one yoki to-many). */
async function resolveEmbed(
  project: Project,
  baseTable: string,
  spec: EmbedSpec,
): Promise<ResolvedEmbed> {
  const key = `${project.ref}:${baseTable}:${spec.name}`;
  const cached = embedCache.get(key);
  if (cached) return { ...cached, select: spec.select };

  const pool = getProjectPool(project);
  const { fwd, rev } = await pool.begin(async (tx) => {
    await tx.unsafe(`set local role "service_role"`);
    const f = (await tx.unsafe(FK_QUERY, [baseTable, spec.name])) as {
      fk_col: string;
      ref_col: string;
    }[];
    const r = (await tx.unsafe(FK_QUERY, [spec.name, baseTable])) as {
      fk_col: string;
      ref_col: string;
    }[];
    return { fwd: f, rev: r };
  });

  let resolved: Omit<ResolvedEmbed, "select">;
  if (fwd.length) {
    // base.fk_col -> rel.ref_col  (to-one)
    resolved = {
      name: spec.name,
      baseTable,
      relTable: spec.name,
      baseCol: fwd[0]!.fk_col,
      relCol: fwd[0]!.ref_col,
      kind: "one",
    };
  } else if (rev.length) {
    // rel.fk_col -> base.ref_col  (to-many)
    resolved = {
      name: spec.name,
      baseTable,
      relTable: spec.name,
      baseCol: rev[0]!.ref_col,
      relCol: rev[0]!.fk_col,
      kind: "many",
    };
  } else {
    throw new RestHttpError(
      400,
      `'${baseTable}' va '${spec.name}' orasida foreign key topilmadi`,
    );
  }
  embedCache.set(key, resolved);
  return { ...resolved, select: spec.select };
}

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
  headers?: Record<string, string>;
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

  // GET uchun embedlarni oldindan FK introspeksiya bilan hal qilamiz.
  let scalarSelect: string | undefined;
  let resolvedEmbeds: ResolvedEmbed[] = [];
  if (method === "GET") {
    const parsed = parseSelectWithEmbeds(firstString(input.query.select));
    scalarSelect = parsed.columns.join(",");
    if (parsed.embeds.length > 0) {
      resolvedEmbeds = await Promise.all(
        parsed.embeds.map((e) => resolveEmbed(project, input.table, e)),
      );
    }
  }

  // Filtrli metodlar uchun ustun tiplari (URL matn qiymatlarini to'g'ri cast qilish).
  let columnTypes: Record<string, string> = {};
  if (method !== "POST") {
    columnTypes = await getColumnTypes(project, input.table);
  }

  try {
    return await pool.begin(async (tx) => {
      // 1 + 2: rol va JWT claim'larni tranzaksiyaga o'rnatamiz.
      await tx.unsafe(`set local role ${quoteIdent(ctx.role)}`);
      await tx.unsafe(`select set_config('request.jwt.claims', $1, true)`, [
        claimsJson,
      ]);

      // 3: metodga qarab so'rov.
      if (method === "GET") {
        const filters = parseFilters(input.query);
        const offset = clampInt(input.query.offset, undefined);
        const q = buildSelect({
          schema: SCHEMA,
          table: input.table,
          select: scalarSelect,
          filters,
          order: parseOrder(input.query.order),
          limit: clampInt(input.query.limit, undefined),
          offset,
          embeds: resolvedEmbeds,
          columnTypes,
        });
        const rows = (await tx.unsafe(q.text, q.params as never[])) as unknown[];

        // count=exact|estimated -> Content-Range header
        const countMode = parseCountMode(input.query.count, input.prefer);
        let total: number | null = null;
        if (countMode === "exact") {
          const c = buildCount({
            schema: SCHEMA,
            table: input.table,
            filters,
            columnTypes,
          });
          const r = (await tx.unsafe(c.text, c.params as never[])) as {
            count: string;
          }[];
          total = Number(r[0]?.count ?? 0);
        } else if (countMode === "estimated") {
          const r = (await tx.unsafe(
            `select reltuples::bigint as count from pg_class
             where relname = $1 and relnamespace = 'public'::regnamespace`,
            [input.table] as never[],
          )) as { count: string }[];
          total = Math.max(0, Number(r[0]?.count ?? 0));
        }

        const start = offset ?? 0;
        const range =
          rows.length === 0
            ? `*/${total ?? 0}`
            : `${start}-${start + rows.length - 1}/${total ?? "*"}`;
        const status =
          total !== null && rows.length < total ? 206 : 200;
        return {
          status,
          body: rows,
          headers: { "content-range": range },
        };
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
          columnTypes,
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
          columnTypes,
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

/** ?count=exact|estimated yoki Prefer: count=exact dan count rejimini oladi. */
function parseCountMode(
  raw: string | string[] | undefined,
  prefer: string | undefined,
): "exact" | "estimated" | null {
  let v = firstString(raw);
  if (!v && prefer) {
    const m = prefer.match(/count=(exact|estimated|planned)/);
    if (m) v = m[1];
  }
  if (v === "exact") return "exact";
  if (v === "estimated" || v === "planned") return "estimated";
  return null;
}

/**
 * Postgres funksiyani chaqiradi (PostgREST /rpc/:fn kabi).
 * Rol + JWT claims o'rnatiladi -> RLS va auth.uid() ishlaydi.
 * Skalyar qaytaruvchi funksiya qiymatni to'g'ridan-to'g'ri qaytaradi.
 */
export async function executeRpc(
  project: Project,
  ctx: ProjectContext,
  fnName: string,
  args: Record<string, unknown>,
): Promise<RestResult> {
  const pool = getProjectPool(project);
  const claimsJson = JSON.stringify(ctx.claims);
  const argNames = Object.keys(args ?? {});
  const params = argNames.map((k) => {
    const v = args[k];
    return v !== null && typeof v === "object" ? JSON.stringify(v) : v;
  });
  const argList = argNames
    .map((k, i) => `${quoteIdent(k)} => $${i + 1}`)
    .join(", ");
  const text = `select * from ${quoteIdent(SCHEMA)}.${quoteIdent(fnName)}(${argList})`;

  try {
    return await pool.begin(async (tx) => {
      await tx.unsafe(`set local role ${quoteIdent(ctx.role)}`);
      await tx.unsafe(`select set_config('request.jwt.claims', $1, true)`, [
        claimsJson,
      ]);
      const rows = (await tx.unsafe(text, params as never[])) as Record<
        string,
        unknown
      >[];
      // Skalyar funksiya (1 qator, 1 ustun) -> qiymatni to'g'ridan-to'g'ri qaytaramiz.
      if (rows.length === 1) {
        const keys = Object.keys(rows[0]!);
        if (keys.length === 1) return { status: 200, body: rows[0]![keys[0]!] };
      }
      return { status: 200, body: rows };
    });
  } catch (err) {
    throw toHttpError(err);
  }
}
