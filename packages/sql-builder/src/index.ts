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

const RESERVED_PARAMS = new Set(["select", "order", "limit", "offset"]);

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

function buildWhere(filters: Filter[], p: Params): string {
  if (filters.length === 0) return "";
  const clauses = filters.map((f) => {
    const col = quoteIdent(f.column);

    if (f.op === "is") {
      const v = f.value.toLowerCase();
      if (v === "null") return `${col} is null`;
      if (v === "not.null" || v === "notnull") return `${col} is not null`;
      if (v === "true") return `${col} is true`;
      if (v === "false") return `${col} is false`;
      throw new QueryError(`'is' uchun yaroqsiz qiymat: ${f.value}`);
    }

    if (f.op === "in") {
      const items = parseInList(f.value);
      if (items.length === 0) return "false";
      const placeholders = items.map((it) => p.add(it)).join(", ");
      return `${col} in (${placeholders})`;
    }

    const sqlOp = COMPARE_OPS[f.op];
    if (!sqlOp) throw new QueryError(`Noma'lum operator: '${f.op}'`);

    let val = f.value;
    if (f.op === "like" || f.op === "ilike") {
      val = val.replace(/\*/g, "%"); // PostgREST uslubi: * -> %
    }
    return `${col} ${sqlOp} ${p.add(val)}`;
  });
  return clauses.join(" and ");
}

export interface SelectOpts {
  schema: string;
  table: string;
  select?: string; // "*" yoki "a,b,c"
  filters: Filter[];
  order: OrderTerm[];
  limit?: number;
  offset?: number;
}

export function buildSelect(opts: SelectOpts): BuiltQuery {
  const p = new Params();
  const cols =
    !opts.select || opts.select.trim() === "*"
      ? "*"
      : opts.select
          .split(",")
          .map((c) => quoteIdent(c.trim()))
          .join(", ");

  let text = `select ${cols} from ${quoteIdent(opts.schema)}.${quoteIdent(opts.table)}`;

  const where = buildWhere(opts.filters, p);
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
}

export function buildUpdate(opts: UpdateOpts): BuiltQuery {
  const entries = Object.entries(opts.set);
  if (entries.length === 0) throw new QueryError("Update uchun maydon yo'q");
  const p = new Params();
  const setSql = entries
    .map(([k, v]) => `${quoteIdent(k)} = ${p.add(v)}`)
    .join(", ");

  let text = `update ${quoteIdent(opts.schema)}.${quoteIdent(opts.table)} set ${setSql}`;
  const where = buildWhere(opts.filters, p);
  if (where) text += ` where ${where}`;
  if (opts.returning) text += " returning *";
  return { text, params: p.values };
}

export interface DeleteOpts {
  schema: string;
  table: string;
  filters: Filter[];
  returning?: boolean;
}

export function buildDelete(opts: DeleteOpts): BuiltQuery {
  const p = new Params();
  let text = `delete from ${quoteIdent(opts.schema)}.${quoteIdent(opts.table)}`;
  const where = buildWhere(opts.filters, p);
  if (where) text += ` where ${where}`;
  if (opts.returning) text += " returning *";
  return { text, params: p.values };
}
