import { ClientContext } from "./context.js";

export type ChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface ChangePayload {
  event: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

/**
 * Realtime kanal. Global WebSocket ishlatadi (brauzer + Node 22+).
 *   db.channel('todos').on('INSERT', (p) => ...).subscribe()
 */
export class RealtimeChannel {
  private ws: WebSocket | null = null;
  private handlers: { event: ChangeEvent; cb: (p: ChangePayload) => void }[] = [];

  constructor(
    private ctx: ClientContext,
    private table: string,
  ) {}

  on(event: ChangeEvent, cb: (payload: ChangePayload) => void): this {
    this.handlers.push({ event, cb });
    return this;
  }

  subscribe(onStatus?: (status: string) => void): this {
    const url = `${this.ctx.wsUrl()}/realtime/v1/websocket?apikey=${this.ctx.effectiveKey()}`;
    this.ws = new WebSocket(url);
    this.ws.onmessage = (e: MessageEvent) => {
      let m: { type: string; event?: string } & Partial<ChangePayload>;
      try {
        m = JSON.parse(String(e.data));
      } catch {
        return;
      }
      if (m.type === "ready") {
        this.ws?.send(JSON.stringify({ type: "subscribe", table: this.table }));
      } else if (m.type === "subscribed") {
        onStatus?.("SUBSCRIBED");
      } else if (m.type === "change") {
        const payload = m as unknown as ChangePayload;
        for (const h of this.handlers) {
          if (h.event === "*" || h.event === payload.event) h.cb(payload);
        }
      } else if (m.type === "error") {
        onStatus?.("ERROR");
      }
    };
    return this;
  }

  unsubscribe(): void {
    this.ws?.close();
    this.ws = null;
  }
}
