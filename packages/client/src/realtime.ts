import { ClientContext } from "./context.js";

export type ChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface ChangePayload {
  event: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

export interface BroadcastMessage {
  event: string;
  payload: unknown;
}

/**
 * Realtime kanal. Global WebSocket ishlatadi (brauzer + Node 22+).
 * Postgres changes + Broadcast + Presence'ni qo'llab-quvvatlaydi.
 *
 *   const ch = db.channel('room1')
 *     .on('INSERT', (p) => ...)              // postgres changes
 *     .onBroadcast('cursor', (m) => ...)     // mijoz↔mijoz
 *     .onPresenceSync(() => ch.presenceState())
 *     .subscribe()
 *   ch.send('cursor', { x: 10 })
 *   ch.track({ user: 'ali' })
 */
export class RealtimeChannel {
  private ws: WebSocket | null = null;
  private changeHandlers: { event: ChangeEvent; cb: (p: ChangePayload) => void }[] = [];
  private broadcastHandlers = new Map<string, ((m: BroadcastMessage) => void)[]>();
  private presenceSyncCbs: (() => void)[] = [];
  private presenceJoinCbs: ((e: { key: string; state: unknown }) => void)[] = [];
  private presenceLeaveCbs: ((e: { key: string }) => void)[] = [];
  private presence: Record<string, unknown[]> = {};
  private presenceKey = randomKey();
  private wantsChanges = false;
  private wantsTopic = false;
  private trackState: unknown = null;

  constructor(
    private ctx: ClientContext,
    private name: string,
  ) {}

  on(event: ChangeEvent, cb: (payload: ChangePayload) => void): this {
    this.changeHandlers.push({ event, cb });
    this.wantsChanges = true;
    return this;
  }
  onBroadcast(event: string, cb: (m: BroadcastMessage) => void): this {
    const arr = this.broadcastHandlers.get(event) ?? [];
    arr.push(cb);
    this.broadcastHandlers.set(event, arr);
    this.wantsTopic = true;
    return this;
  }
  onPresenceSync(cb: () => void): this {
    this.presenceSyncCbs.push(cb);
    this.wantsTopic = true;
    return this;
  }
  onPresenceJoin(cb: (e: { key: string; state: unknown }) => void): this {
    this.presenceJoinCbs.push(cb);
    this.wantsTopic = true;
    return this;
  }
  onPresenceLeave(cb: (e: { key: string }) => void): this {
    this.presenceLeaveCbs.push(cb);
    this.wantsTopic = true;
    return this;
  }

  subscribe(onStatus?: (status: string) => void): this {
    const url = `${this.ctx.wsUrl()}/realtime/v1/websocket?apikey=${this.ctx.effectiveKey()}`;
    this.ws = new WebSocket(url);
    this.ws.onmessage = (e: MessageEvent) => this.handle(String(e.data), onStatus);
    return this;
  }

  private handle(data: string, onStatus?: (s: string) => void): void {
    let m: Record<string, unknown>;
    try {
      m = JSON.parse(data);
    } catch {
      return;
    }
    switch (m.type) {
      case "ready":
        if (this.wantsChanges)
          this.ws?.send(JSON.stringify({ type: "subscribe", table: this.name }));
        if (this.wantsTopic)
          this.ws?.send(JSON.stringify({ type: "join", topic: this.name }));
        break;
      case "subscribed":
      case "joined":
        onStatus?.("SUBSCRIBED");
        if (this.trackState !== null) this.sendTrack();
        break;
      case "change":
        for (const h of this.changeHandlers)
          if (h.event === "*" || h.event === (m.event as string))
            h.cb(m as unknown as ChangePayload);
        break;
      case "broadcast":
        for (const cb of this.broadcastHandlers.get(m.event as string) ?? [])
          cb({ event: m.event as string, payload: m.payload });
        break;
      case "presence_sync":
        this.presence = (m.state as Record<string, unknown[]>) ?? {};
        this.presenceSyncCbs.forEach((cb) => cb());
        break;
      case "presence_join":
        (this.presence[m.key as string] ??= []).push(m.state);
        this.presenceJoinCbs.forEach((cb) =>
          cb({ key: m.key as string, state: m.state }),
        );
        this.presenceSyncCbs.forEach((cb) => cb());
        break;
      case "presence_leave":
        delete this.presence[m.key as string];
        this.presenceLeaveCbs.forEach((cb) => cb({ key: m.key as string }));
        this.presenceSyncCbs.forEach((cb) => cb());
        break;
      case "error":
        onStatus?.("ERROR");
        break;
    }
  }

  /** Topic'dagi boshqalarga broadcast xabar yuboradi. */
  send(event: string, payload: unknown): void {
    this.ws?.send(
      JSON.stringify({ type: "broadcast", topic: this.name, event, payload }),
    );
  }

  /** O'z presence holatini belgilaydi. */
  track(state: unknown): void {
    this.trackState = state;
    this.wantsTopic = true;
    if (this.ws && this.ws.readyState === 1) this.sendTrack();
  }
  private sendTrack(): void {
    this.ws?.send(
      JSON.stringify({
        type: "presence_track",
        topic: this.name,
        key: this.presenceKey,
        state: this.trackState,
      }),
    );
  }
  untrack(): void {
    this.ws?.send(JSON.stringify({ type: "presence_untrack", topic: this.name }));
  }

  presenceState(): Record<string, unknown[]> {
    return this.presence;
  }

  unsubscribe(): void {
    this.ws?.close();
    this.ws = null;
  }
}

function randomKey(): string {
  // crypto.randomUUID brauzer + Node'da global.
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}
