import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { executeRest, RestHttpError } from "@storagedb/rest";
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

  await reply.code(result.status).send(result.body);
}

/**
 * REST routelarini ro'yxatdan o'tkazadi:
 *   /v1/:ref/rest/v1/:table  (GET/POST/PATCH/DELETE)
 * Bu route catch-all'dan aniqroq bo'lgani uchun ustun keladi.
 */
export function registerRestRoutes(app: FastifyInstance): void {
  app.route({
    method: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    url: "/v1/:ref/rest/v1/:table",
    handler: handle,
  });
}

export { RestHttpError };
