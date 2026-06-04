import { randomBytes } from "node:crypto";
import { getProjectPool } from "@storagedb/db";
import { getConfig } from "@storagedb/config";
import { signJwt, verifyJwt } from "@storagedb/jwt";
import type { Project } from "@storagedb/types";
import { hashPassword, verifyPassword } from "./password.js";
import {
  sendMail,
  smtpConfigured,
  confirmEmailHtml,
  recoveryEmailHtml,
} from "./mailer.js";

export { hashPassword, verifyPassword } from "./password.js";
export { smtpConfigured } from "./mailer.js";

export interface SignupResult {
  user: AuthUser;
  session: Session | null; // tasdiqlash kerak bo'lsa null
}

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
  confirmation_token: string | null;
  recovery_token: string | null;
  recovery_sent_at: string | null;
  banned_until: string | null;
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

/**
 * Yangi foydalanuvchi ro'yxatdan o'tkazadi.
 * AUTH_AUTOCONFIRM=true -> darhol tasdiqlanadi va sessiya beriladi.
 * Aks holda -> tasdiqlash emaili yuboriladi, sessiya null bo'ladi.
 */
export async function signup(
  project: Project,
  email: string,
  password: string,
  metadata: Record<string, unknown> = {},
  linkBase?: string,
): Promise<SignupResult> {
  if (!email || !password || password.length < 6) {
    throw new AuthError(400, "email va kamida 6 belgili password kerak");
  }
  const autoconfirm = getConfig().AUTH_AUTOCONFIRM;
  const encrypted = await hashPassword(password);
  const token = randomBytes(32).toString("hex");

  return asService(project, async (tx) => {
    const existing = await tx<{ id: string }[]>`
      select id from auth.users where email = ${email.toLowerCase()}
    `;
    if (existing.length > 0) {
      throw new AuthError(409, "Bu email allaqachon ro'yxatdan o'tgan");
    }
    const [user] = await tx<UserRow[]>`
      insert into auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at, confirmation_token)
      values (
        ${email.toLowerCase()}, ${encrypted}, ${tx.json(metadata as never)},
        ${autoconfirm ? tx`now()` : null},
        ${autoconfirm ? null : token}
      )
      returning *
    `;
    if (autoconfirm) {
      return { user: toUser(user!), session: await issueSession(project, user!, tx) };
    }
    // Tasdiqlash emaili
    const link = `${linkBase ?? ""}/verify?token=${token}&type=signup`;
    await sendMail(user!.email, "Email'ingizni tasdiqlang", confirmEmailHtml(link));
    return { user: toUser(user!), session: null };
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
    if (!user.email_confirmed_at) {
      throw new AuthError(400, "Email hali tasdiqlanmagan");
    }
    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      throw new AuthError(403, "Foydalanuvchi bloklangan");
    }
    return issueSession(project, user, tx);
  });
}

// ── Admin (service_role) foydalanuvchi boshqaruvi ──
export interface AdminUserView extends AuthUser {
  banned_until: string | null;
}
function toAdminUser(r: UserRow): AdminUserView {
  return { ...toUser(r), banned_until: r.banned_until };
}

export async function adminListUsers(
  project: Project,
  opts: { limit?: number; offset?: number } = {},
): Promise<AdminUserView[]> {
  return asService(project, async (tx) => {
    const rows = await tx<UserRow[]>`
      select * from auth.users order by created_at desc
      limit ${opts.limit ?? 100} offset ${opts.offset ?? 0}
    `;
    return rows.map(toAdminUser);
  });
}

export async function adminCreateUser(
  project: Project,
  input: { email: string; password: string; user_metadata?: Record<string, unknown> },
): Promise<AdminUserView> {
  if (!input.email || !input.password || input.password.length < 6) {
    throw new AuthError(400, "email va kamida 6 belgili password kerak");
  }
  const encrypted = await hashPassword(input.password);
  return asService(project, async (tx) => {
    const [user] = await tx<UserRow[]>`
      insert into auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
      values (${input.email.toLowerCase()}, ${encrypted}, ${tx.json((input.user_metadata ?? {}) as never)}, now())
      returning *
    `;
    return toAdminUser(user!);
  });
}

export async function adminUpdateUser(
  project: Project,
  id: string,
  patch: { password?: string; banned?: boolean; user_metadata?: Record<string, unknown> },
): Promise<AdminUserView> {
  return asService(project, async (tx) => {
    if (patch.password) {
      const enc = await hashPassword(patch.password);
      await tx`update auth.users set encrypted_password = ${enc}, updated_at = now() where id = ${id}`;
    }
    if (patch.banned !== undefined) {
      if (patch.banned) {
        await tx`update auth.users set banned_until = now() + interval '100 years', updated_at = now() where id = ${id}`;
        await tx`update auth.refresh_tokens set revoked = true where user_id = ${id}`;
      } else {
        await tx`update auth.users set banned_until = null, updated_at = now() where id = ${id}`;
      }
    }
    if (patch.user_metadata) {
      await tx`update auth.users set raw_user_meta_data = ${tx.json(patch.user_metadata as never)}, updated_at = now() where id = ${id}`;
    }
    const [user] = await tx<UserRow[]>`select * from auth.users where id = ${id}`;
    if (!user) throw new AuthError(404, "Foydalanuvchi topilmadi");
    return toAdminUser(user);
  });
}

export async function adminDeleteUser(
  project: Project,
  id: string,
): Promise<void> {
  await asService(project, async (tx) => {
    await tx`delete from auth.users where id = ${id}`;
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

/** Email tasdiqlash tokenini tekshiradi va sessiya beradi. */
export async function verifyEmail(
  project: Project,
  token: string,
): Promise<Session> {
  if (!token) throw new AuthError(400, "token kerak");
  return asService(project, async (tx) => {
    const [user] = await tx<UserRow[]>`
      select * from auth.users where confirmation_token = ${token}
    `;
    if (!user) throw new AuthError(401, "Tasdiqlash tokeni yaroqsiz");
    await tx`
      update auth.users set email_confirmed_at = now(), confirmation_token = null, updated_at = now()
      where id = ${user.id}
    `;
    return issueSession(
      project,
      { ...user, email_confirmed_at: new Date().toISOString() },
      tx,
    );
  });
}

/** Parolni tiklash so'rovi — recovery_token yaratib email yuboradi (mavjudlikni oshkor qilmaydi). */
export async function requestRecovery(
  project: Project,
  email: string,
  linkBase?: string,
): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await asService(project, async (tx) => {
    const [user] = await tx<UserRow[]>`
      select * from auth.users where email = ${email.toLowerCase()}
    `;
    if (!user) return; // jim — email mavjudligini oshkor qilmaymiz
    await tx`
      update auth.users set recovery_token = ${token}, recovery_sent_at = now()
      where id = ${user.id}
    `;
    const link = `${linkBase ?? ""}/verify?token=${token}&type=recovery`;
    await sendMail(user.email, "Parolni tiklash", recoveryEmailHtml(link));
  });
}

/** Recovery token bilan yangi parol o'rnatadi (1 soat amal qiladi). */
export async function resetPassword(
  project: Project,
  token: string,
  newPassword: string,
): Promise<void> {
  if (!token || !newPassword || newPassword.length < 6) {
    throw new AuthError(400, "token va kamida 6 belgili parol kerak");
  }
  const encrypted = await hashPassword(newPassword);
  await asService(project, async (tx) => {
    const [user] = await tx<UserRow[]>`
      select * from auth.users
      where recovery_token = ${token}
        and recovery_sent_at > now() - interval '1 hour'
    `;
    if (!user) throw new AuthError(401, "Tiklash tokeni yaroqsiz yoki muddati o'tgan");
    await tx`
      update auth.users
      set encrypted_password = ${encrypted}, recovery_token = null,
          email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
      where id = ${user.id}
    `;
    // Barcha eski sessiyalarni bekor qilamiz
    await tx`update auth.refresh_tokens set revoked = true where user_id = ${user.id}`;
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
