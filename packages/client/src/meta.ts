import { ClientContext } from "./context.js";

export interface MetaResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

/**
 * Management / meta operatsiyalari — ixtiyoriy SQL va DDL (CREATE TABLE, ALTER…).
 *
 * ⚠️ FAQAT `service_key` bilan ishlaydi. `anon_key` bilan server 403 qaytaradi
 * ("meta/query uchun service_role kerak") — bu ataylab: ommaviy client DDL
 * qila olmasligi kerak. Shu sabab buni faqat backend kodida ishlating.
 *
 *   const db = createClient(url, SERVICE_KEY);
 *   await db.meta.query(`create table public.todos (
 *     id bigint generated always as identity primary key,
 *     title text not null
 *   )`);
 */
export class MetaClient {
  constructor(private ctx: ClientContext) {}

  /**
   * Loyiha DB'sida ixtiyoriy SQL bajaradi. SELECT bo'lsa qatorlar `data` da
   * qaytadi; DDL/komanda bo'lsa `data` bo'sh massiv (`[]`) bo'ladi.
   */
  async query<T = Record<string, unknown>>(
    sql: string,
  ): Promise<MetaResult<T[]>> {
    try {
      const res = await fetch(`${this.ctx.apiUrl}/meta/query`, {
        method: "POST",
        headers: this.ctx.headers({ "content-type": "application/json" }),
        body: JSON.stringify({ query: sql }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) {
        return {
          data: null,
          error: {
            message: json?.error ?? `HTTP ${res.status}`,
            code: json?.code,
          },
        };
      }
      return { data: (json?.rows ?? []) as T[], error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }
}
