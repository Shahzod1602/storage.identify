import type { FastifyRequest } from "fastify";
import { getProjectByRef } from "@storagedb/db";
import { verifyJwt, JwtError } from "@storagedb/jwt";
import type { ProjectContext } from "@storagedb/types";

export class GatewayError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

/** `apikey` header yoki `Authorization: Bearer <token>` dan token oladi. */
function extractToken(req: FastifyRequest): string | null {
  const apikey = req.headers["apikey"];
  if (typeof apikey === "string" && apikey.length > 0) return apikey;

  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

/**
 * URL'dagi ref bo'yicha loyihani topadi, tokenni loyiha jwtSecret bilan
 * tekshiradi va so'rov kontekstini (loyiha + rol + claims) qaytaradi.
 */
export async function resolveContext(
  req: FastifyRequest,
  ref: string,
): Promise<ProjectContext> {
  const project = await getProjectByRef(ref);
  if (!project) {
    throw new GatewayError(404, `Loyiha topilmadi: ${ref}`);
  }

  const token = extractToken(req);
  if (!token) {
    throw new GatewayError(
      401,
      "API kalit kerak ('apikey' header yoki 'Authorization: Bearer')",
    );
  }

  try {
    const claims = await verifyJwt(project.jwtSecret, token);
    return { project, role: claims.role, claims };
  } catch (err) {
    if (err instanceof JwtError) {
      throw new GatewayError(401, `Yaroqsiz token: ${err.message}`);
    }
    throw err;
  }
}
