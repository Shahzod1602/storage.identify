import { ClientContext } from "./context.js";
import { QueryBuilder } from "./query.js";
import { AuthClient } from "./auth.js";
import { StorageClient } from "./storage.js";
import { MetaClient } from "./meta.js";
import { RealtimeChannel } from "./realtime.js";

export type { QueryResult } from "./query.js";
export type { Session, AuthUser } from "./auth.js";
export type { ChangePayload, ChangeEvent } from "./realtime.js";
export type { MetaResult } from "./meta.js";

export class StorageDbClient {
  readonly auth: AuthClient;
  readonly storage: StorageClient;
  /** Management/meta: ixtiyoriy SQL va DDL — faqat service_key bilan. */
  readonly meta: MetaClient;
  private ctx: ClientContext;

  constructor(apiUrl: string, apiKey: string) {
    // Oxiridagi '/' ni olib tashlaymiz.
    this.ctx = new ClientContext(apiUrl.replace(/\/$/, ""), apiKey);
    this.auth = new AuthClient(this.ctx);
    this.storage = new StorageClient(this.ctx);
    this.meta = new MetaClient(this.ctx);
  }

  /** Jadval bilan ishlash: db.from('todos').select('*').eq(...) */
  from<T = Record<string, unknown>>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(this.ctx, table);
  }

  /** Postgres funksiyani chaqirish: db.rpc('fn', { a: 1 }) */
  async rpc<T = unknown>(
    fn: string,
    args: Record<string, unknown> = {},
  ): Promise<{ data: T | null; error: { message: string } | null }> {
    try {
      const res = await fetch(`${this.ctx.apiUrl}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: this.ctx.headers({ "content-type": "application/json" }),
        body: JSON.stringify(args),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      return { data: json as T, error: null };
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } };
    }
  }

  /** Realtime kanal: db.channel('todos').on('INSERT', cb).subscribe() */
  channel(table: string): RealtimeChannel {
    return new RealtimeChannel(this.ctx, table);
  }
}

/**
 * storagedb client yaratadi (supabase-js'dagi createClient kabi).
 * @param apiUrl Loyiha API URL'i, masalan http://localhost:8000/v1/<ref>
 * @param apiKey anon yoki service kalit
 */
export function createClient(apiUrl: string, apiKey: string): StorageDbClient {
  return new StorageDbClient(apiUrl, apiKey);
}
