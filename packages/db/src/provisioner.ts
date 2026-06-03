import { randomBytes } from "node:crypto";
import { customAlphabet } from "nanoid";
import { getConfig } from "@storagedb/config";
import { generateProjectKeys } from "@storagedb/jwt";
import type { Project, ProjectKeys } from "@storagedb/types";
import { platform, connect } from "./client.js";
import { authenticatorRole, authenticatorPassword } from "./roles.js";
import { encryptSecret } from "./crypto.js";

// URL-xavfsiz, kichik harf + raqam (db/role nomlari uchun ham xavfsiz).
const makeRef = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);

/**
 * Klaster darajasidagi umumiy rollarni (anon/authenticated/service_role)
 * idempotent yaratadi. Bu rollar barcha loyiha database'lari uchun umumiy,
 * lekin RLS siyosatlari har bir database ichida alohida bo'lgani uchun
 * loyihalararo ma'lumot sizib chiqmaydi.
 */
export async function ensureSharedRoles(): Promise<void> {
  const sql = connect(getConfig().PROJECTS_DATABASE_URL);
  try {
    await sql.unsafe(`
      do $$ begin
        if not exists (select from pg_roles where rolname = 'anon') then
          create role anon nologin noinherit;
        end if;
        if not exists (select from pg_roles where rolname = 'authenticated') then
          create role authenticated nologin noinherit;
        end if;
        if not exists (select from pg_roles where rolname = 'service_role') then
          create role service_role nologin noinherit bypassrls;
        end if;
      end $$;
    `);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

interface CreateProjectInput {
  name: string;
  organizationId?: string;
  ownerEmail?: string;
}

/**
 * Yangi loyiha yaratadi:
 *  1. control-plane'ga yozuv qo'shadi (kalit/secret bilan)
 *  2. proj_<ref> database yaratadi
 *  3. database ichida schema/rol/grant/helper'larni bootstrap qiladi
 * Qaytaradi: loyiha + bir martalik kalitlar (anon/service).
 */
export async function createProject(
  input: CreateProjectInput,
): Promise<{ project: Project; keys: ProjectKeys }> {
  const sql = platform();
  const ref = makeRef();
  const dbName = `proj_${ref}`;
  const jwtSecret = randomBytes(32).toString("hex");

  await ensureSharedRoles();

  // 1. Tashkilotni hal qilamiz (berilmasa standart yaratamiz).
  let organizationId = input.organizationId;
  if (!organizationId) {
    const [org] = await sql<{ id: string }[]>`
      insert into organizations (name)
      values (${input.name + " org"})
      returning id
    `;
    organizationId = org!.id;
  }

  // 2. Control-plane yozuvi (provisioning holatida).
  const [row] = await sql<
    {
      id: string;
      ref: string;
      organization_id: string;
      name: string;
      db_name: string;
      created_at: string;
    }[]
  >`
    insert into projects (ref, organization_id, name, db_name, jwt_secret, status)
    values (${ref}, ${organizationId}, ${input.name}, ${dbName}, ${encryptSecret(jwtSecret)}, 'provisioning')
    returning id, ref, organization_id, name, db_name, created_at
  `;

  if (input.ownerEmail) {
    await sql`
      insert into project_members (project_id, user_email, role)
      values (${row!.id}, ${input.ownerEmail}, 'owner')
      on conflict do nothing
    `;
  }

  // 3. Database va bootstrap.
  try {
    await provisionDatabase(ref, dbName);
    await sql`update projects set status = 'active' where id = ${row!.id}`;
  } catch (err) {
    await sql`update projects set status = 'failed' where id = ${row!.id}`;
    throw err;
  }

  // 4. Kalitlar.
  const { anonKey, serviceKey } = await generateProjectKeys(jwtSecret, ref);
  await sql`
    insert into api_keys (project_id, name, role, token_prefix) values
      (${row!.id}, 'anon', 'anon', ${anonKey.slice(0, 12)}),
      (${row!.id}, 'service_role', 'service_role', ${serviceKey.slice(0, 12)})
  `;

  const project: Project = {
    id: row!.id,
    ref: row!.ref,
    organizationId: row!.organization_id,
    name: row!.name,
    dbName: row!.db_name,
    jwtSecret: jwtSecret, // xotirada plaintext; DB'da shifrlangan
    createdAt: row!.created_at,
  };

  return { project, keys: { ref, anonKey, serviceKey } };
}

/** proj_<ref> database'ini yaratib, ichini bootstrap qiladi. */
async function provisionDatabase(ref: string, dbName: string): Promise<void> {
  const cfg = getConfig();
  const adminUrl = cfg.PROJECTS_DATABASE_URL;

  // CREATE DATABASE tranzaksiya ichida bo'lmasligi kerak -> alohida ulanish.
  const admin = connect(adminUrl);
  try {
    const exists = await admin<{ one: number }[]>`
      select 1 as one from pg_database where datname = ${dbName}
    `;
    if (exists.length === 0) {
      // Identifikatorlar ref'dan olingan (faqat [a-z0-9]) -> xavfsiz.
      await admin.unsafe(`create database "${dbName}"`);
    }
  } finally {
    await admin.end({ timeout: 5 });
  }

  // Yangi database'ga ulanib bootstrap qilamiz.
  const projUrl = replaceDatabaseInUrl(adminUrl, dbName);
  const db = connect(projUrl);
  try {
    await db.unsafe(bootstrapSql(ref, dbName));
  } finally {
    await db.end({ timeout: 5 });
  }
}

/** Yangi loyiha database'i ichida bajariladigan bootstrap SQL. */
function bootstrapSql(ref: string, dbName: string): string {
  const authRole = authenticatorRole(ref);
  const password = authenticatorPassword(ref);

  return `
-- Schemalar
create schema if not exists auth;
create schema if not exists storage;

-- JWT claim'larini o'qiydigan helper'lar (REST qatlami set_config bilan beradi).
create or replace function auth.jwt() returns jsonb language sql stable as $fn$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$fn$;

create or replace function auth.uid() returns uuid language sql stable as $fn$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$fn$;

create or replace function auth.role() returns text language sql stable as $fn$
  select coalesce(auth.jwt() ->> 'role', 'anon')
$fn$;

-- Schema foydalanish huquqlari
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth, storage to anon, authenticated, service_role;

-- service_role public schemada jadval yaratishi mumkin (dashboard SQL editor uchun).
grant create on schema public to service_role;

-- Kelajakdagi jadval/sequence'lar uchun standart huquqlar (RLS baribir qatorlarni nazorat qiladi).
-- (a) bootstrap roli (superuser) yaratgan jadvallar uchun:
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
-- (b) service_role yaratgan jadvallar uchun (dashboard orqali):
alter default privileges for role service_role in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role service_role in schema public grant all on sequences to anon, authenticated, service_role;

-- ═══════════ AUTH (Phase 2) ═══════════
create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique not null,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create table if not exists auth.refresh_tokens (
  token       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  revoked     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_refresh_user on auth.refresh_tokens(user_id);

-- Parol hashlari himoyada: auth jadvallariga faqat service_role kira oladi.
grant all on all tables in schema auth to service_role;
grant all on all sequences in schema auth to service_role;
alter default privileges in schema auth grant all on tables to service_role;

-- ═══════════ STORAGE (Phase 3) ═══════════
create table if not exists storage.buckets (
  id          text primary key,
  public      boolean not null default false,
  created_at  timestamptz not null default now()
);
create table if not exists storage.objects (
  id          uuid primary key default gen_random_uuid(),
  bucket_id   text not null references storage.buckets(id) on delete cascade,
  name        text not null,
  owner       uuid,
  size        bigint,
  mime_type   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (bucket_id, name)
);
grant all on all tables in schema storage to service_role;
grant select on storage.objects, storage.buckets to anon, authenticated;
alter default privileges in schema storage grant all on tables to service_role;

-- ═══════════ REALTIME (Phase 4) ═══════════
create schema if not exists realtime;
grant usage on schema realtime to anon, authenticated, service_role;

-- Har o'zgarishda pg_notify('realtime_changes', ...) chaqiruvchi umumiy trigger.
create or replace function realtime.notify_change() returns trigger language plpgsql as $rt$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'type', TG_OP,
    'schema', TG_TABLE_SCHEMA,
    'table', TG_TABLE_NAME,
    'record', case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end,
    'old_record', case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end
  );
  -- pg_notify 8000 bayt bilan cheklangan; juda katta qatorlarda record tashlanadi.
  begin
    perform pg_notify('realtime_changes', payload::text);
  exception when others then
    perform pg_notify('realtime_changes', jsonb_build_object(
      'type', TG_OP, 'schema', TG_TABLE_SCHEMA, 'table', TG_TABLE_NAME, 'record', null, 'old_record', null
    )::text);
  end;
  return null;
end;
$rt$;

-- Jadvalga realtime yoqish: select realtime.enable('public.todos');
create or replace function realtime.enable(tbl regclass) returns void language plpgsql as $en$
begin
  execute format('drop trigger if exists realtime_notify on %s', tbl);
  execute format('create trigger realtime_notify after insert or update or delete on %s for each row execute function realtime.notify_change()', tbl);
end;
$en$;

-- Loyihaga xos login (authenticator) rol: REST shu rol orqali ulanib,
-- JWT'dagi role'ga qarab SET ROLE anon|authenticated|service_role qiladi.
do $$ begin
  if not exists (select from pg_roles where rolname = '${authRole}') then
    create role "${authRole}" login password '${password}' noinherit;
  else
    alter role "${authRole}" login password '${password}' noinherit;
  end if;
end $$;

grant anon, authenticated, service_role to "${authRole}";

-- Izolyatsiya: faqat shu loyihaning authenticator'i ulana oladi.
revoke connect on database "${dbName}" from public;
grant connect on database "${dbName}" to "${authRole}";
`;
}

function replaceDatabaseInUrl(url: string, dbName: string): string {
  const u = new URL(url);
  u.pathname = `/${dbName}`;
  return u.toString();
}
