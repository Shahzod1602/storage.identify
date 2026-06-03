import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getProjectByRef } from "@storagedb/db";
import { verifyJwt } from "@storagedb/jwt";
import type { Project } from "@storagedb/types";
import {
  signup,
  login,
  refresh,
  getUser,
  logout,
  AuthError,
} from "@storagedb/auth";
import { GatewayError } from "./context.js";

/** Loyihani topadi va apikey (anon/service) borligini tekshiradi. */
async function gate(req: FastifyRequest, ref: string): Promise<Project> {
  const project = await getProjectByRef(ref);
  if (!project) throw new GatewayError(404, `Loyiha topilmadi: ${ref}`);

  const apikey = req.headers["apikey"];
  const key = Array.isArray(apikey) ? apikey[0] : apikey;
  if (!key) throw new GatewayError(401, "apikey header kerak");
  try {
    await verifyJwt(project.jwtSecret, key);
  } catch {
    throw new GatewayError(401, "apikey yaroqsiz");
  }
  return project;
}

/** Authorization: Bearer <access_token> dan tokenni oladi. */
function bearer(req: FastifyRequest): string {
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  throw new GatewayError(401, "Authorization: Bearer <token> kerak");
}

interface Credentials {
  email?: string;
  password?: string;
  data?: Record<string, unknown>;
}

export function registerAuthRoutes(app: FastifyInstance): void {
  // Ro'yxatdan o'tish
  app.post("/v1/:ref/auth/v1/signup", async (req, reply) => {
    const project = await gate(req, (req.params as { ref: string }).ref);
    const { email, password, data } = (req.body ?? {}) as Credentials;
    const session = await signup(project, email ?? "", password ?? "", data ?? {});
    return reply.code(200).send(session);
  });

  // Token olish: ?grant_type=password | refresh_token
  app.post("/v1/:ref/auth/v1/token", async (req, reply) => {
    const project = await gate(req, (req.params as { ref: string }).ref);
    const grant = (req.query as { grant_type?: string }).grant_type;
    const body = (req.body ?? {}) as Credentials & { refresh_token?: string };

    if (grant === "password") {
      const session = await login(project, body.email ?? "", body.password ?? "");
      return reply.send(session);
    }
    if (grant === "refresh_token") {
      const session = await refresh(project, body.refresh_token ?? "");
      return reply.send(session);
    }
    throw new GatewayError(400, "grant_type: 'password' yoki 'refresh_token'");
  });

  // Joriy foydalanuvchi (access token bilan)
  app.get("/v1/:ref/auth/v1/user", async (req, reply) => {
    const project = await gate(req, (req.params as { ref: string }).ref);
    const user = await getUser(project, bearer(req));
    return reply.send(user);
  });

  // Chiqish
  app.post("/v1/:ref/auth/v1/logout", async (req, reply) => {
    const project = await gate(req, (req.params as { ref: string }).ref);
    await logout(project, bearer(req));
    return reply.code(204).send();
  });
}

export { AuthError };
