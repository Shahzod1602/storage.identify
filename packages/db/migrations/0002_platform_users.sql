-- Platforma foydalanuvchilari (dashboard login uchun) — super_admin + user.
-- Bu loyiha ichidagi auth.users'dan FARQLI (ular har loyihaning o'z foydalanuvchilari).
create table if not exists platform_users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique not null,
  encrypted_password text not null,
  role               text not null default 'user',  -- super_admin | user
  created_at         timestamptz not null default now()
);

-- Loyiha egasi (qaysi platform user yaratgan). null = eski/super admin loyihasi.
alter table projects add column if not exists owner_id uuid
  references platform_users(id) on delete set null;

create index if not exists idx_projects_owner on projects(owner_id);
