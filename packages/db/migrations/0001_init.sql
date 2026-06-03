-- Control-plane (platform) schema.
-- Bu yerda barcha loyihalar, tashkilotlar va API kalitlar metama'lumoti saqlanadi.
-- Loyihalarning HAQIQIY ma'lumotlari esa har birining alohida `proj_<ref>` database'ida.

create extension if not exists "pgcrypto";

create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists projects (
  id               uuid primary key default gen_random_uuid(),
  ref              text not null unique,            -- qisqa URL-xavfsiz id
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  db_name          text not null unique,            -- proj_<ref>
  jwt_secret       text not null,                   -- loyiha JWT'larini imzolash uchun
  status           text not null default 'active',  -- active | provisioning | failed
  created_at       timestamptz not null default now()
);

create table if not exists project_members (
  project_id  uuid not null references projects(id) on delete cascade,
  -- Phase 5'da platform foydalanuvchilari qo'shilganda kengayadi:
  user_email  text not null,
  role        text not null default 'owner',        -- owner | admin | developer
  created_at  timestamptz not null default now(),
  primary key (project_id, user_email)
);

create table if not exists api_keys (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,                        -- 'anon' | 'service_role' | custom
  role        text not null,                        -- anon | authenticated | service_role
  -- Token'ning o'zi emas, faqat prefiksi/hash saqlanadi (xavfsizlik uchun).
  -- anon/service kalitlar uzoq muddatli JWT bo'lgani uchun ularni qayta
  -- generatsiya qilsa bo'ladi; bu jadval auditing/rotation uchun.
  token_prefix text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_projects_org on projects(organization_id);
create index if not exists idx_api_keys_project on api_keys(project_id);
