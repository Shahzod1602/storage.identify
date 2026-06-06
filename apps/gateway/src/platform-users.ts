import { platform } from "@storagedb/db";
import { hashPassword, verifyPassword } from "@storagedb/auth";
import { getConfig } from "@storagedb/config";
import type { PlatformRole } from "@storagedb/jwt";
import { GatewayError } from "./context.js";

export interface PlatformUser {
  id: string;
  email: string;
  role: PlatformRole;
  created_at: string;
}

interface UserRow extends PlatformUser {
  encrypted_password: string;
}

/** Startup'da birinchi super admin'ni yaratadi (paroli = PLATFORM_ADMIN_TOKEN). */
export async function seedSuperAdmin(): Promise<void> {
  const sql = platform();
  const cfg = getConfig();
  const existing = await sql<{ one: number }[]>`
    select 1 as one from platform_users where role = 'super_admin' limit 1
  `;
  if (existing.length > 0) return;
  const enc = await hashPassword(cfg.PLATFORM_ADMIN_TOKEN);
  await sql`
    insert into platform_users (email, encrypted_password, role)
    values (${cfg.SUPER_ADMIN_EMAIL.toLowerCase()}, ${enc}, 'super_admin')
    on conflict (email) do nothing
  `;
}

export async function verifyPlatformLogin(
  email: string,
  password: string,
): Promise<PlatformUser | null> {
  const sql = platform();
  const [u] = await sql<UserRow[]>`
    select id, email, encrypted_password, role, created_at
    from platform_users where email = ${email.toLowerCase()}
  `;
  if (!u || !(await verifyPassword(password, u.encrypted_password))) return null;
  return { id: u.id, email: u.email, role: u.role, created_at: u.created_at };
}

export async function listPlatformUsers(): Promise<PlatformUser[]> {
  const sql = platform();
  return sql<PlatformUser[]>`
    select id, email, role, created_at from platform_users order by created_at desc
  `;
}

// @ va keyin nuqtali domen shart bo'lgan oddiy format tekshiruvi.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createPlatformUser(
  email: string,
  password: string,
  role: PlatformRole = "user",
): Promise<PlatformUser> {
  if (!email || !EMAIL_RE.test(email)) {
    throw new GatewayError(400, "Email manzili noto'g'ri");
  }
  if (!password || password.length < 6) {
    throw new GatewayError(400, "Parol kamida 6 belgi bo'lishi kerak");
  }
  const sql = platform();
  const exists = await sql<{ one: number }[]>`
    select 1 as one from platform_users where email = ${email.toLowerCase()}
  `;
  if (exists.length > 0) throw new GatewayError(409, "Bu email allaqachon mavjud");
  const enc = await hashPassword(password);
  const [u] = await sql<PlatformUser[]>`
    insert into platform_users (email, encrypted_password, role)
    values (${email.toLowerCase()}, ${enc}, ${role})
    returning id, email, role, created_at
  `;
  return u!;
}

export async function deletePlatformUser(id: string): Promise<void> {
  const sql = platform();
  await sql`delete from platform_users where id = ${id} and role <> 'super_admin'`;
}
