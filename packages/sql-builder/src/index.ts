// Xavfsiz, parametrli SQL builder (PostgREST uslubidagi REST API uchun).
// Tamoyil: IDENTIFIKATORLAR (jadval/ustun) quote qilinadi, QIYMATLAR esa
// hech qachon matnga qo'shilmaydi — faqat $1..$N parametr sifatida uzatiladi.
// Shu bilan SQL-injection imkonsiz bo'ladi.

export class QueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueryError";
  }
}

/** Postgres identifikatorini xavfsiz quote qiladi. */
export function quoteIdent(name: string): string {
  if (typeof name !== "string" || name.length === 0) {
    throw new QueryError("Bo'sh identifikator");
  }
  return `"${name.replace(/"/g, '""')}"`;
}

/** $1..$N parametrlarni yig'uvchi yordamchi. */
class Params {
  readonly values: unknown[] = [];
  add(value: unknown): string {
    // jsonb/array qiymatlar uchun obyektlarni JSON'ga aylantiramiz.
    const v =
      value !== null && typeof value === "object"
        ? JSON.stringify(value)
        : value;
    this.values.push(v);
    return `$${this.values.length}`;
  }
}

export interface Filter {
  column: string;
  op: string;
  value: string;
}

export interface OrderTerm {
  column: string;
  dir: "asc" | "desc";
}

export interface BuiltQuery {
  text: string;
  params: unknown[];
}

const COMPARE_OPS: Record<string, string> = {
  eq: "=",
  neq: "<>",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  like: "like",
  ilike: "ilike",
};

const RESERVED_PARAMS = new Set([
  "select",
  "order",
  "limit",
  "offset",
  "count",
]);

/** URL query obyektidan filtrlarni ajratadi (masalan ?id=eq.5&age=gt.18). */
export function parseFilters(
  query: Record<string, string | string[] | undefined>,
): Filter[] {
  const filters: Filter[] = [];
  for (const [column, raw] of Object.entries(query)) {
    if (RESERVED_PARAMS.has(column)) continue;
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value == null) continue;
    const dot = value.indexOf(".");
    if (dot === -1) {
      throw new QueryError(
        `Filtr formati noto'g'ri: '${column}=${value}' (kutilgan: op.qiymat)`,
      );
    }
    filters.push({
      column,
      op: value.slice(0, dot),
      value: value.slice(dot + 1),
    });
  }
  return filters;
}

/** ?order=col.asc,col2.desc ni parse qiladi. */
export function parseOrder(
  raw: string | string[] | undefined,
): OrderTerm[] {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return [];
  return value.split(",").map((part) => {
    const [column, dir] = part.split(".");
    if (!column) throw new QueryError(`order ustuni bo'sh: '${part}'`);
    return { column, dir: dir === "desc" ? "desc" : "asc" };
  });
}

function parseInList(value: string): string[] {
  const trimmed = value.trim().replace(/^\(/, "").replace(/\)$/, "");
  if (trimmed === "") return [];
  return trimmed.split(",").map((s) => s.trim());
}

// URL filtr qiymatlari doim MATN. postgres.js ularni text deb bog'laydi.
// Raqam/sana/uuid ustunlar uchun PARAMETRNI ustun tipiga cast qilamiz ($1::int8).
// MUHIM: bool ustun uchun param'ni ::bool qilib BO'LMAYDI — postgres.js'ning bool
// serializer'i matn "true"ni `=== true` deb tekshirib false yuboradi. Shuning uchun
// bool (va matn pattern) uchun USTUNNI text'ga cast qilamiz.
function isBoolType(type?: string): boolean {
  return type === "bool" || type === "boolean";
}
function castParam(placeholder: string, type?: string): string {
  if (type && !isBoolType(type) && /^[a-z0-9_]+$/.test(type)) {
    return `${placeholder}::${type}`;
  }
  return placeholder;
}

function buildWhere(
  filters: Filter[],
  p: Params,
  columnTypes: Record<string, string> = {},
): string {
  if (filters.length === 0) return "";
  const clauses = filters.map((f) => {
    const rawCol = quoteIdent(f.column);
    const type = columnTypes[f.column];
    const bool = isBoolType(type);
    // bool ustun -> solishtirish uchun ustunni text'ga aylantiramiz.
    const col = bool ? `${rawCol}::text` : rawCol;

    if (f.op === "is") {
      const v = f.value.toLowerCase();
      if (v === "null") return `${rawCol} is null`;
      if (v === "not.null" || v === "notnull") return `${rawCol} is not null`;
      if (v === "true") return `${rawCol} is true`;
      if (v === "false") return `${rawCol} is false`;
      throw new QueryError(`'is' uchun yaroqsiz qiymat: ${f.value}`);
    }

    if (f.op === "in") {
      const items = parseInList(f.value);
      if (items.length === 0) return "false";
      const placeholders = items
        .map((it) => (bool ? p.add(it) : castParam(p.add(it), type)))
        .join(", ");
      return `${col} in (${placeholders})`;
    }

    const sqlOp = COMPARE_OPS[f.op];
    if (!sqlOp) throw new QueryError(`Noma'lum operator: '${f.op}'`);

    if (f.op === "like" || f.op === "ilike") {
      const val = f.value.replace(/\*/g, "%"); // PostgREST: * -> %
      return `${rawCol}::text ${sqlOp} ${p.add(val)}`;
    }
    // bool -> col allaqachon ::text; aks holda param'ni tipga cast qilamiz.
    return bool
      ? `${col} ${sqlOp} ${p.add(f.value)}`
      : `${rawCol} ${sqlOp} ${castParam(p.add(f.value), type)}`;
  });
  return clauses.join(" and ");
}

// ── Embedded resurslar (PostgREST FK expansion: select=*,rel(*)) ──
export interface EmbedSpec {
  name: string; // bog'liq jadval nomi (yoki alias)
  select: string; // ichki ustunlar ("*" yoki "a,b")
}
export interface ResolvedEmbed extends EmbedSpec {
  baseTable: string;
  relTable: string;
  baseCol: string; // base jadvaldagi join ustuni
  relCol: string; // bog'liq jadvaldagi join ustuni
  kind: "one" | "many";
}

/** Yuqori darajadagi vergullarni qavslarni hurmat qilib bo'ladi. */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

/** select=*,author(name) ni skalyar ustunlar + embedlarga ajratadi. */
export function parseSelectWithEmbeds(select: string | undefined): {
  columns: string[];
  embeds: EmbedSpec[];
} {
  if (!select || select.trim() === "" || select.trim() === "*") {
    return { columns: ["*"], embeds: [] };
  }
  const columns: string[] = [];
  const embeds: EmbedSpec[] = [];
  for (const part of splitTopLevel(select)) {
    const m = part.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*)\)$/);
    if (m) embeds.push({ name: m[1]!, select: m[2]!.trim() || "*" });
    else columns.push(part);
  }
  if (columns.length === 0) columns.push("*");
  return { columns, embeds };
}

function embedColumnSql(opts: SelectOpts, e: ResolvedEmbed): string {
  const relCols =
    e.select.trim() === "*"
      ? "*"
      : e.select
          .split(",")
          .map((c) => quoteIdent(c.trim()))
          .join(", ");
  const schema = quoteIdent(opts.schema);
  const rel = quoteIdent(e.relTable);
  const baseRef = `${quoteIdent(opts.table)}.${quoteIdent(e.baseCol)}`;
  const where = `r.${quoteIdent(e.relCol)} = ${baseRef}`;
  const inner = `select ${relCols} from ${schema}.${rel} r where ${where}`;
  const sub =
    e.kind === "one"
      ? `(select to_jsonb(__e) from (${inner} limit 1) __e)`
      : `(select coalesce(json_agg(__e), '[]'::json) from (${inner}) __e)`;
  return `${sub} as ${quoteIdent(e.name)}`;
}

export interface SelectOpts {
  schema: string;
  table: string;
  select?: string; // "*" yoki "a,b,c"
  filters: Filter[];
  order: OrderTerm[];
  limit?: number;
  offset?: number;
  embeds?: ResolvedEmbed[];
  columnTypes?: Record<string, string>;
}

export function buildSelect(opts: SelectOpts): BuiltQuery {
  const p = new Params();
  const colParts: string[] =
    !opts.select || opts.select.trim() === "*"
      ? ["*"]
      : opts.select.split(",").map((c) => quoteIdent(c.trim()));
  for (const e of opts.embeds ?? []) colParts.push(embedColumnSql(opts, e));
  const cols = colParts.join(", ");

  let text = `select ${cols} from ${quoteIdent(opts.schema)}.${quoteIdent(opts.table)}`;

  const where = buildWhere(opts.filters, p, opts.columnTypes);
  if (where) text += ` where ${where}`;

  if (opts.order.length > 0) {
    const order = opts.order
      .map((o) => `${quoteIdent(o.column)} ${o.dir}`)
      .join(", ");
    text += ` order by ${order}`;
  }

  if (opts.limit != null) text += ` limit ${p.add(opts.limit)}`;
  if (opts.offset != null) text += ` offset ${p.add(opts.offset)}`;

  return { text, params: p.values };
}

/** Filtrlarga mos qatorlar sonini hisoblaydi (count=exact uchun). */
export function buildCount(opts: {
  schema: string;
  table: string;
  filters: Filter[];
  columnTypes?: Record<string, string>;
}): BuiltQuery {
  const p = new Params();
  let text = `select count(*)::bigint as count from ${quoteIdent(opts.schema)}.${quoteIdent(opts.table)}`;
  const where = buildWhere(opts.filters, p, opts.columnTypes);
  if (where) text += ` where ${where}`;
  return { text, params: p.values };
}

export interface InsertOpts {
  schema: string;
  table: string;
  rows: Record<string, unknown>[];
  returning?: boolean;
}

export function buildInsert(opts: InsertOpts): BuiltQuery {
  if (opts.rows.length === 0) throw new QueryError("Insert uchun qator yo'q");
  const p = new Params();
  const cols = Object.keys(opts.rows[0]!);
  if (cols.length === 0) throw new QueryError("Insert uchun ustun yo'q");

  const colSql = cols.map(quoteIdent).join(", ");
  const valuesSql = opts.rows
    .map((row) => `(${cols.map((c) => p.add(row[c] ?? null)).join(", ")})`)
    .join(", ");

  let text = `insert into ${quoteIdent(opts.schema)}.${quoteIdent(opts.table)} (${colSql}) values ${valuesSql}`;
  if (opts.returning) text += " returning *";
  return { text, params: p.values };
}

export interface UpdateOpts {
  schema: string;
  table: string;
  set: Record<string, unknown>;
  filters: Filter[];
  returning?: boolean;
  columnTypes?: Record<string, string>;
}

export function buildUpdate(opts: UpdateOpts): BuiltQuery {
  const entries = Object.entries(opts.set);
  if (entries.length === 0) throw new QueryError("Update uchun maydon yo'q");
  const p = new Params();
  const setSql = entries
    .map(([k, v]) => `${quoteIdent(k)} = ${p.add(v)}`)
    .join(", ");

  let text = `update ${quoteIdent(opts.schema)}.${quoteIdent(opts.table)} set ${setSql}`;
  const where = buildWhere(opts.filters, p, opts.columnTypes);
  if (where) text += ` where ${where}`;
  if (opts.returning) text += " returning *";
  return { text, params: p.values };
}

export interface DeleteOpts {
  schema: string;
  table: string;
  filters: Filter[];
  returning?: boolean;
  columnTypes?: Record<string, string>;
}

export function buildDelete(opts: DeleteOpts): BuiltQuery {
  const p = new Params();
  let text = `delete from ${quoteIdent(opts.schema)}.${quoteIdent(opts.table)}`;
  const where = buildWhere(opts.filters, p, opts.columnTypes);
  if (where) text += ` where ${where}`;
  if (opts.returning) text += " returning *";
  return { text, params: p.values };
}
