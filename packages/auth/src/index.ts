import { randomBytes } from "node:crypto";
import { getProjectPool } from "@storagedb/db";
import { signJwt, verifyJwt } from "@storagedb/jwt";
import type { Project } from "@storagedb/types";
import { hashPassword, verifyPassword } from "./password.js";

export { hashPassword, verifyPassword } from "./password.js";

const ACCESS_TOKEN_TTL = "1h";

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  user_metadata: Record<string, unknown>;
  created_at: string;
}

export interface Session {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  refresh_token: string;
  user: AuthUser;
}

interface UserRow {
  id: string;
  email: string;
  encrypted_password: string | null;
  email_confirmed_at: string | null;
  raw_user_meta_data: Record<string, unknown>;
  created_at: string;
}

function toUser(r: UserRow): AuthUser {
  return {
    id: r.id,
    email: r.email,
    email_confirmed_at: r.email_confirmed_at,
    user_metadata: r.raw_user_meta_data,
    created_at: r.created_at,
  };
}

/** Loyiha DB'sida service_role rolида callback ishlatadi (auth jadvallariga kirish). */
async function asService<T>(
  project: Project,
  fn: (tx: import("@storagedb/db").Sql) => Promise<T>,
): Promise<T> {
  const pool = getProjectPool(project);
  return pool.begin(async (tx) => {
    await tx.unsafe(`set local role "service_role"`);
    return fn(tx as unknown as import("@storagedb/db").Sql);
  }) as Promise<T>;
}

async function issueSession(
  project: Project,
  user: UserRow,
  tx: import("@storagedb/db").Sql,
): Promise<Session> {
  const access_token = await signJwt(project.jwtSecret, "authenticated", {
    sub: user.id,
    expiresIn: ACCESS_TOKEN_TTL,
    issuer: `storagedb/${project.ref}`,
    extra: { email: user.email },
  });
  const refresh_token = randomBytes(32).toString("hex");
  await tx`
    insert into auth.refresh_tokens (token, user_id) values (${refresh_token}, ${user.id})
  `;
  return {
    access_token,
    token_type: "bearer",
    expires_in: 3600,
    refresh_token,
    user: toUser(user),
  };
}

/** Yangi foydalanuvchi ro'yxatdan o'tkazadi. */
export async function signup(
  project: Project,
  email: string,
  password: string,
  metadata: Record<string, unknown> = {},
): Promise<Session> {
  if (!email || !password || password.length < 6) {
    throw new AuthError(400, "email va kamida 6 belgili password kerak");
  }
  const encrypted = await hashPassword(password);
  return asService(project, async (tx) => {
    const existing = await tx<{ id: string }[]>`
      select id from auth.users where email = ${email.toLowerCase()}
    `;
    if (existing.length > 0) {
      throw new AuthError(409, "Bu email allaqachon ro'yxatdan o'tgan");
    }
    const [user] = await tx<UserRow[]>`
      insert into auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
      values (${email.toLowerCase()}, ${encrypted}, ${tx.json(metadata as never)}, now())
      returning *
    `;
    return issueSession(project, user!, tx);
  });
}

/** Email + parol bilan kirish. */
export async function login(
  project: Project,
  email: string,
  password: string,
): Promise<Session> {
  return asService(project, async (tx) => {
    const [user] = await tx<UserRow[]>`
      select * from auth.users where email = ${email.toLowerCase()}
    `;
    if (!user || !(await verifyPassword(password, user.encrypted_password))) {
      throw new AuthError(400, "Email yoki parol noto'g'ri");
    }
    return issueSession(project, user, tx);
  });
}

/** Refresh token bilan yangi sessiya (rotatsiya bilan). */
export async function refresh(
  project: Project,
  refreshToken: string,
): Promise<Session> {
  return asService(project, async (tx) => {
    const [row] = await tx<{ user_id: string; revoked: boolean }[]>`
      select user_id, revoked from auth.refresh_tokens where token = ${refreshToken}
    `;
    if (!row || row.revoked) {
      throw new AuthError(401, "Refresh token yaroqsiz");
    }
    await tx`update auth.refresh_tokens set revoked = true where token = ${refreshToken}`;
    const [user] = await tx<UserRow[]>`
      select * from auth.users where id = ${row.user_id}
    `;
    if (!user) throw new AuthError(401, "Foydalanuvchi topilmadi");
    return issueSession(project, user, tx);
  });
}

/** Access token'dan joriy foydalanuvchini qaytaradi. */
export async function getUser(
  project: Project,
  accessToken: string,
): Promise<AuthUser> {
  const claims = await verifyJwt(project.jwtSecret, accessToken).catch(() => {
    throw new AuthError(401, "Access token yaroqsiz");
  });
  if (!claims.sub) throw new AuthError(401, "Token'da foydalanuvchi yo'q");
  return asService(project, async (tx) => {
    const [user] = await tx<UserRow[]>`
      select * from auth.users where id = ${claims.sub!}
    `;
    if (!user) throw new AuthError(404, "Foydalanuvchi topilmadi");
    return toUser(user);
  });
}

/** Foydalanuvchining barcha refresh tokenlarini bekor qiladi (logout). */
export async function logout(
  project: Project,
  accessToken: string,
): Promise<void> {
  const claims = await verifyJwt(project.jwtSecret, accessToken).catch(() => {
    throw new AuthError(401, "Access token yaroqsiz");
  });
  if (!claims.sub) return;
  await asService(project, async (tx) => {
    await tx`update auth.refresh_tokens set revoked = true where user_id = ${claims.sub!}`;
  });
}
