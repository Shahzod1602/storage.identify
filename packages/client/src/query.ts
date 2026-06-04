import { ClientContext } from "./context.js";

export interface QueryResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count: number | null;
  status: number;
}

type CountMode = "exact" | "estimated";

/**
 * PostgREST uslubidagi so'rov quruvchi. `await` qilinadi (thenable):
 *   const { data, error } = await db.from('todos').select('*').eq('done', false)
 */
export class QueryBuilder<T = Record<string, unknown>>
  implements PromiseLike<QueryResult<T>>
{
  private method = "GET";
  private selectCols = "*";
  private filters: string[] = [];
  private orderParts: string[] = [];
  private limitVal?: number;
  private offsetVal?: number;
  private countMode?: CountMode;
  private body?: unknown;
  private preferParts: string[] = [];
  private returnSingle = false;

  constructor(
    private ctx: ClientContext,
    private table: string,
  ) {}

  select(columns = "*", opts?: { count?: CountMode }): this {
    this.selectCols = columns;
    if (opts?.count) this.countMode = opts.count;
    if (this.method !== "GET") this.preferParts.push("return=representation");
    return this;
  }
  insert(values: unknown): this {
    this.method = "POST";
    this.body = values;
    this.preferParts.push("return=representation");
    return this;
  }
  upsert(values: unknown): this {
    this.method = "POST";
    this.body = values;
    this.preferParts.push("resolution=merge-duplicates", "return=representation");
    return this;
  }
  update(values: unknown): this {
    this.method = "PATCH";
    this.body = values;
    this.preferParts.push("return=representation");
    return this;
  }
  delete(): this {
    this.method = "DELETE";
    this.preferParts.push("return=representation");
    return this;
  }

  // ── Filtrlar ──
  private f(col: string, op: string, val: unknown): this {
    this.filters.push(`${encodeURIComponent(col)}=${op}.${encodeURIComponent(String(val))}`);
    return this;
  }
  eq(c: string, v: unknown): this { return this.f(c, "eq", v); }
  neq(c: string, v: unknown): this { return this.f(c, "neq", v); }
  gt(c: string, v: unknown): this { return this.f(c, "gt", v); }
  gte(c: string, v: unknown): this { return this.f(c, "gte", v); }
  lt(c: string, v: unknown): this { return this.f(c, "lt", v); }
  lte(c: string, v: unknown): this { return this.f(c, "lte", v); }
  like(c: string, v: string): this { return this.f(c, "like", v); }
  ilike(c: string, v: string): this { return this.f(c, "ilike", v); }
  is(c: string, v: "null" | "not.null" | boolean): this {
    this.filters.push(`${encodeURIComponent(c)}=is.${v}`);
    return this;
  }
  in(c: string, arr: unknown[]): this {
    const list = arr.map((v) => encodeURIComponent(String(v))).join(",");
    this.filters.push(`${encodeURIComponent(c)}=in.(${list})`);
    return this;
  }

  // ── Tartib / sahifalash ──
  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderParts.push(`${col}.${opts?.ascending === false ? "desc" : "asc"}`);
    return this;
  }
  limit(n: number): this {
    this.limitVal = n;
    return this;
  }
  range(from: number, to: number): this {
    this.offsetVal = from;
    this.limitVal = to - from + 1;
    return this;
  }
  single(): this {
    this.returnSingle = true;
    this.limitVal = 1;
    return this;
  }

  private buildUrl(): string {
    const qs: string[] = [`select=${encodeURIComponent(this.selectCols)}`];
    qs.push(...this.filters);
    if (this.orderParts.length) qs.push(`order=${this.orderParts.join(",")}`);
    if (this.limitVal != null) qs.push(`limit=${this.limitVal}`);
    if (this.offsetVal != null) qs.push(`offset=${this.offsetVal}`);
    if (this.countMode) qs.push(`count=${this.countMode}`);
    return `${this.ctx.apiUrl}/rest/v1/${this.table}?${qs.join("&")}`;
  }

  async exec(): Promise<QueryResult<T>> {
    const headers = this.ctx.headers({ "content-type": "application/json" });
    if (this.preferParts.length) headers["prefer"] = this.preferParts.join(",");
    let res: Response;
    try {
      res = await fetch(this.buildUrl(), {
        method: this.method,
        headers,
        body: this.body !== undefined ? JSON.stringify(this.body) : undefined,
      });
    } catch (e) {
      return { data: null, error: { message: (e as Error).message }, count: null, status: 0 };
    }
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      return {
        data: null,
        error: { message: json?.error ?? `HTTP ${res.status}`, code: json?.code },
        count: null,
        status: res.status,
      };
    }
    const range = res.headers.get("content-range");
    const count = range && range.includes("/") ? rangeTotal(range) : null;
    const data = this.returnSingle
      ? ((Array.isArray(json) ? json[0] : json) ?? null)
      : json;
    return { data: data as T, error: null, count, status: res.status };
  }

  then<R1 = QueryResult<T>, R2 = never>(
    onfulfilled?: ((v: QueryResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

function rangeTotal(range: string): number | null {
  const total = range.split("/")[1];
  if (!total || total === "*") return null;
  const n = Number(total);
  return Number.isNaN(n) ? null : n;
}
