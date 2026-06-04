import type { FastifyInstance, FastifyRequest } from "fastify";
import websocket from "@fastify/websocket";
import { getProjectByRef } from "@storagedb/db";
import { verifyJwt } from "@storagedb/jwt";
import { RealtimeHub, type WebSocketLike } from "@storagedb/realtime";
import { realtimeConnect, realtimeDisconnect } from "./metrics.js";

export const hub = new RealtimeHub();

// @fastify/websocket v11: handler (socket, req); eski versiyalarda (conn).socket.
type WsLike = WebSocketLike & {
  on(event: string, cb: (data: unknown) => void): void;
  close(code?: number, reason?: string): void;
};

interface ClientMessage {
  type?: string;
  table?: string;
}

export async function registerRealtime(app: FastifyInstance): Promise<void> {
  await app.register(websocket);

  app.get(
    "/v1/:ref/realtime/v1/websocket",
    { websocket: true },
    async (conn: unknown, req: FastifyRequest) => {
      const socket = (
        conn && typeof conn === "object" && "socket" in conn
          ? (conn as { socket: WsLike }).socket
          : (conn as WsLike)
      ) as WsLike;

      const { ref } = req.params as { ref: string };
      const apikey = (req.query as { apikey?: string }).apikey;

      const project = await getProjectByRef(ref);
      if (!project) {
        socket.send(JSON.stringify({ type: "error", message: "Loyiha topilmadi" }));
        socket.close();
        return;
      }
      // apikey'ni tekshirib, role + claims'ni saqlaymiz (RLS uchun).
      let claims;
      try {
        if (!apikey) throw new Error("apikey kerak");
        claims = await verifyJwt(project.jwtSecret, apikey);
      } catch {
        socket.send(JSON.stringify({ type: "error", message: "apikey yaroqsiz" }));
        socket.close();
        return;
      }

      socket.send(JSON.stringify({ type: "ready", ref, role: claims.role }));
      realtimeConnect(ref);

      socket.on("message", (raw: unknown) => {
        let msg: ClientMessage;
        try {
          msg = JSON.parse(String(raw)) as ClientMessage;
        } catch {
          socket.send(JSON.stringify({ type: "error", message: "Yaroqsiz JSON" }));
          return;
        }
        if (msg.type === "subscribe" && msg.table) {
          void hub
            .subscribe(project, msg.table, socket, claims.role, claims)
            .then(() =>
              socket.send(
                JSON.stringify({ type: "subscribed", table: msg.table }),
              ),
            );
        } else if (msg.type === "unsubscribe" && msg.table) {
          hub.unsubscribe(ref, msg.table, socket);
          socket.send(JSON.stringify({ type: "unsubscribed", table: msg.table }));
        }
      });

      socket.on("close", () => {
        hub.removeSocket(ref, socket);
        realtimeDisconnect(ref);
      });
    },
  );
}
