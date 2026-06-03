import { getProjectPool } from "@storagedb/db";
import type { Project, ProjectRole, JwtClaims } from "@storagedb/types";

// Minimal WebSocket interfeysi (@fastify/websocket / ws bilan mos).
export interface WebSocketLike {
  send(data: string): void;
  readyState: number;
}
const OPEN = 1;

// pg_notify payload formati (realtime.notify_change trigger'idan).
interface ChangePayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  schema: string;
  table: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

interface Subscriber {
  socket: WebSocketLike;
  role: ProjectRole;
  claims: JwtClaims;
}

interface ProjectListener {
  project: Project;
  subscribers: Map<string, Set<Subscriber>>; // table -> obunachilar
  pkCache: Map<string, string[]>; // table -> primary key ustunlari
  unlisten: (() => Promise<void>) | null;
  starting: Promise<void> | null;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Realtime hub: har loyiha DB'sida 'realtime_changes' kanalini LISTEN qiladi
 * va o'zgarishlarni RLS'ni HURMAT QILGAN HOLDA tegishli obunachilarga uzatadi.
 *
 * Xavfsizlik: har o'zgarish har obunachi uchun alohida tekshiriladi —
 *   - service_role: hammasini oladi (BYPASSRLS)
 *   - anon/authenticated: faqat o'zining RLS siyosati ko'rsatadigan qatorlarni
 *     oladi (INSERT/UPDATE PK bo'yicha qayta tekshiriladi).
 * DELETE'da qator yo'q -> faqat primary key qaytariladi (Supabase default kabi).
 */
export class RealtimeHub {
  private listeners = new Map<string, ProjectListener>();

  private get(project: Project): ProjectListener {
    let l = this.listeners.get(project.ref);
    if (!l) {
      l = {
        project,
        subscribers: new Map(),
        pkCache: new Map(),
        unlisten: null,
        starting: null,
      };
      this.listeners.set(project.ref, l);
    }
    return l;
  }

  private async ensureListening(project: Project): Promise<void> {
    const l = this.get(project);
    if (l.unlisten) return;
    if (l.starting) return l.starting;
    const pool = getProjectPool(project);
    l.starting = pool
      .listen("realtime_changes", (payload: string) => {
        void this.dispatch(project.ref, payload);
      })
      .then((sub) => {
        l.unlisten = sub.unlisten;
      });
    return l.starting;
  }

  /** Jadvalning primary key ustunlarini introspeksiya qiladi (keshlanadi). */
  private async primaryKey(
    l: ProjectListener,
    table: string,
  ): Promise<string[]> {
    const cached = l.pkCache.get(table);
    if (cached) return cached;
    const pool = getProjectPool(l.project);
    const rows = await pool.begin(async (tx) => {
      await tx.unsafe(`set local role "service_role"`);
      return tx.unsafe(
        `select a.attname as name
         from pg_index i
         join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
         where i.indrelid = format('%I.%I','public',$1::text)::regclass and i.indisprimary
         order by array_position(i.indkey, a.attnum)`,
        [table],
      );
    });
    const cols = (rows as unknown as { name: string }[]).map((r) => r.name);
    l.pkCache.set(table, cols);
    return cols;
  }

  /**
   * Obunachi shu qatorni ko'ra oladimi? service_role -> ha.
   * Aks holda RLS ostida PK bo'yicha qayta select qilamiz.
   */
  private async canSee(
    l: ProjectListener,
    table: string,
    pk: string[],
    record: Record<string, unknown>,
    sub: Subscriber,
  ): Promise<boolean> {
    if (sub.role === "service_role") return true;
    if (pk.length === 0) return false; // PK yo'q -> xavfsizlik uchun yubormaymiz
    const where = pk.map((c, i) => `${quoteIdent(c)} = $${i + 1}`).join(" and ");
    const params = pk.map((c) => record[c]);
    if (params.some((v) => v === undefined)) return false;
    const pool = getProjectPool(l.project);
    const rows = await pool.begin(async (tx) => {
      await tx.unsafe(`set local role ${quoteIdent(sub.role)}`);
      await tx.unsafe(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify(sub.claims),
      ]);
      return tx.unsafe(
        `select 1 from public.${quoteIdent(table)} where ${where} limit 1`,
        params as never[],
      );
    });
    return (rows as unknown[]).length > 0;
  }

  private async dispatch(ref: string, payload: string): Promise<void> {
    const l = this.listeners.get(ref);
    if (!l) return;
    let change: ChangePayload;
    try {
      change = JSON.parse(payload) as ChangePayload;
    } catch {
      return;
    }
    const subs = l.subscribers.get(change.table);
    if (!subs || subs.size === 0) return;

    const pk = await this.primaryKey(l, change.table).catch(() => [] as string[]);

    // old_record'ni faqat PK ustunlariga qisqartiramiz (ma'lumot sizishining oldini olish).
    const pkOnly = (rec: Record<string, unknown> | null) => {
      if (!rec) return null;
      const out: Record<string, unknown> = {};
      for (const c of pk) out[c] = rec[c];
      return out;
    };

    // Vizibillikni tekshiramiz uchun manba qator: INSERT/UPDATE -> record, DELETE -> old_record.
    const checkRow = change.type === "DELETE" ? change.old_record : change.record;

    for (const sub of subs) {
      if (sub.socket.readyState !== OPEN) continue;
      let allowed = false;
      if (sub.role === "service_role") {
        allowed = true;
      } else if (change.type === "DELETE") {
        // O'chirilgan qatorni qayta tekshirib bo'lmaydi -> faqat PK yuboramiz,
        // lekin kontent emas. (Supabase default replica identity bilan bir xil.)
        allowed = pk.length > 0;
      } else if (checkRow) {
        allowed = await this.canSee(l, change.table, pk, checkRow, sub);
      }
      if (!allowed) continue;

      const message = JSON.stringify({
        type: "change",
        table: change.table,
        schema: change.schema,
        event: change.type,
        // service_role to'liq oladi; boshqalar UPDATE/DELETE'da old_record faqat PK.
        record: change.type === "DELETE" ? null : change.record,
        old_record:
          sub.role === "service_role" ? change.old_record : pkOnly(change.old_record),
      });
      sub.socket.send(message);
    }
  }

  /** Mijozni jadvalga obuna qiladi (role + claims bilan). */
  async subscribe(
    project: Project,
    table: string,
    socket: WebSocketLike,
    role: ProjectRole,
    claims: JwtClaims,
  ): Promise<void> {
    await this.ensureListening(project);
    const l = this.get(project);
    let set = l.subscribers.get(table);
    if (!set) {
      set = new Set();
      l.subscribers.set(table, set);
    }
    set.add({ socket, role, claims });
  }

  unsubscribe(ref: string, table: string, socket: WebSocketLike): void {
    const set = this.listeners.get(ref)?.subscribers.get(table);
    if (!set) return;
    for (const s of set) if (s.socket === socket) set.delete(s);
  }

  removeSocket(ref: string, socket: WebSocketLike): void {
    const l = this.listeners.get(ref);
    if (!l) return;
    for (const set of l.subscribers.values()) {
      for (const s of set) if (s.socket === socket) set.delete(s);
    }
  }

  async close(): Promise<void> {
    for (const l of this.listeners.values()) {
      if (l.unlisten) await l.unlisten();
    }
    this.listeners.clear();
  }
}
