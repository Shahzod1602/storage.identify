import { getProjectPool } from "@storagedb/db";
import type { Project } from "@storagedb/types";

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
  record: unknown;
  old_record: unknown;
}

interface ProjectListener {
  // table -> obunachilar
  subscribers: Map<string, Set<WebSocketLike>>;
  unlisten: (() => Promise<void>) | null;
  starting: Promise<void> | null;
}

/**
 * Realtime hub: har loyiha DB'sida 'realtime_changes' kanalini LISTEN qiladi
 * va o'zgarishlarni tegishli jadvalga obuna bo'lgan WebSocket mijozlarga uzatadi.
 *
 * Eslatma (v1): per-row RLS realtime'da qo'llanmaydi — faqat
 * realtime.enable(...) bilan yoqilgan jadvallar event yuboradi.
 */
export class RealtimeHub {
  private listeners = new Map<string, ProjectListener>();

  private get(ref: string): ProjectListener {
    let l = this.listeners.get(ref);
    if (!l) {
      l = { subscribers: new Map(), unlisten: null, starting: null };
      this.listeners.set(ref, l);
    }
    return l;
  }

  /** Loyiha kanalini bir marta LISTEN qilishni boshlaydi. */
  private async ensureListening(project: Project): Promise<void> {
    const l = this.get(project.ref);
    if (l.unlisten) return;
    if (l.starting) return l.starting;

    const pool = getProjectPool(project);
    l.starting = pool
      .listen("realtime_changes", (payload: string) =>
        this.dispatch(project.ref, payload),
      )
      .then((sub) => {
        l.unlisten = sub.unlisten;
      });
    return l.starting;
  }

  private dispatch(ref: string, payload: string): void {
    const l = this.listeners.get(ref);
    if (!l) return;
    let change: ChangePayload;
    try {
      change = JSON.parse(payload) as ChangePayload;
    } catch {
      return;
    }
    const targets = l.subscribers.get(change.table);
    if (!targets || targets.size === 0) return;

    const message = JSON.stringify({
      type: "change",
      table: change.table,
      schema: change.schema,
      event: change.type,
      record: change.record,
      old_record: change.old_record,
    });
    for (const socket of targets) {
      if (socket.readyState === OPEN) socket.send(message);
    }
  }

  /** Mijozni jadvalga obuna qiladi. */
  async subscribe(
    project: Project,
    table: string,
    socket: WebSocketLike,
  ): Promise<void> {
    await this.ensureListening(project);
    const l = this.get(project.ref);
    let set = l.subscribers.get(table);
    if (!set) {
      set = new Set();
      l.subscribers.set(table, set);
    }
    set.add(socket);
  }

  /** Mijozni bitta jadvaldan chiqaradi. */
  unsubscribe(ref: string, table: string, socket: WebSocketLike): void {
    this.listeners.get(ref)?.subscribers.get(table)?.delete(socket);
  }

  /** Ulanish uzilganda mijozni hamma joydan olib tashlaydi. */
  removeSocket(ref: string, socket: WebSocketLike): void {
    const l = this.listeners.get(ref);
    if (!l) return;
    for (const set of l.subscribers.values()) set.delete(socket);
  }

  /** Barcha LISTEN ulanishlarini yopadi (shutdown). */
  async close(): Promise<void> {
    for (const l of this.listeners.values()) {
      if (l.unlisten) await l.unlisten();
    }
    this.listeners.clear();
  }
}
