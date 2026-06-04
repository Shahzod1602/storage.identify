import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { executeRest, executeRpc, RestHttpError } from "@storagedb/rest";
import { resolveContext } from "./context.js";

interface RestParams {
  ref: string;
  table: string;
}

async function handle(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { ref, table } = req.params as RestParams;
  const ctx = await resolveContext(req, ref);

  const prefer = req.headers["prefer"];
  const result = await executeRest(ctx.project, ctx, {
    method: req.method,
    table,
    query: req.query as Record<string, string | string[] | undefined>,
    body: req.body,
    prefer: Array.isArray(prefer) ? prefer[0] : prefer,
  });

  if (result.headers) {
    for (const [k, v] of Object.entries(result.headers)) reply.header(k, v);
  }
  await reply.code(result.status).send(result.body);
}

/**
 * REST routelarini ro'yxatdan o'tkazadi:
 *   /v1/:ref/rest/v1/:table  (GET/POST/PATCH/DELETE)
 * Bu route catch-all'dan aniqroq bo'lgani uchun ustun keladi.
 */
async function handleRpc(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { ref, fn } = req.params as { ref: string; fn: string };
  const ctx = await resolveContext(req, ref);
  const args = (req.body ?? {}) as Record<string, unknown>;
  const result = await executeRpc(ctx.project, ctx, fn, args);
  await reply.code(result.status).send(result.body);
}

export function registerRestRoutes(app: FastifyInstance): void {
  app.route({
    method: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    url: "/v1/:ref/rest/v1/:table",
    handler: handle,
  });
  // RPC: Postgres funksiyalarini chaqirish
  app.route({
    method: ["POST"],
    url: "/v1/:ref/rest/v1/rpc/:fn",
    handler: handleRpc,
  });
}

export { RestHttpError };
