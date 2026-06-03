# storagedb

Self-hosted, multi-tenant **Supabase muqobili** (BaaS) — noldan TypeScript'da.
Bitta serverda ko'p loyihaga xizmat qiladi: Postgres + REST API + Auth + Storage + Realtime + Dashboard.

> Maqsad: ko'p loyiha uchun Supabase Cloud obunasini to'lamaslik. Faqat VPS puli.

## Holat — barcha Phase tugadi ✅

- [x] **Phase 0** — Monorepo, control-plane DB, loyiha provisioning, gateway routing + auth
- [x] **Phase 1** — REST API (avtomatik CRUD + filtrlar + RLS)
- [x] **Phase 2** — Auth (signup/login/JWT refresh/scrypt)
- [x] **Phase 3** — Storage (fayllar, public/private, signed URL)
- [x] **Phase 4** — Realtime (WebSocket + LISTEN/NOTIFY)
- [x] **Phase 5** — Studio dashboard (Next.js)
- [x] **Phase 6** — Production hardening (helmet, rate-limit, Docker)

## Arxitektura

- **Multi-tenancy:** har loyiha = alohida `proj_<ref>` Postgres database (kuchli izolyatsiya).
- **Control-plane** (`platform` DB): loyihalar, tashkilotlar, kalitlar.
- **Rollar/RLS:** har loyiha DB'sida `anon` / `authenticated` / `service_role` + `auth.uid()`/`auth.role()`/`auth.jwt()` helperlar (Supabase modeli).
- **Gateway:** so'rovni loyiha `ref` bo'yicha yo'naltiradi, JWT/kalitni tekshiradi, barcha servislarni bitta jarayonda jamlaydi (modular monolith).

```
packages/
  config · types · jwt · db (client, migrate, provisioner, pool)
  sql-builder · rest · auth · storage · realtime
apps/
  gateway   — barcha API (REST/Auth/Storage/Realtime/Admin/Meta)
  studio    — Next.js dashboard
```

## API yo'llari (har loyiha)

| Yo'l | Vazifa |
|---|---|
| `/v1/:ref/rest/v1/:table` | REST CRUD (RLS bilan) |
| `/v1/:ref/auth/v1/signup`, `/token`, `/user`, `/logout` | Auth |
| `/v1/:ref/storage/v1/bucket`, `/object/...`, `/public/...`, `/signed/...` | Storage |
| `/v1/:ref/realtime/v1/websocket` | Realtime (WS) |
| `/v1/:ref/meta/query` | SQL (service_key) |
| `/admin/projects`, `/admin/projects/:ref/keys` | Admin (x-admin-token) |

## Talablar

- Node.js ≥ 20, pnpm
- PostgreSQL 16/17 (local: `brew services start postgresql@17`, yoki `docker compose -f docker/docker-compose.yml up -d`)

## Ishga tushirish (local)

```bash
pnpm install
cp .env.example .env          # kerak bo'lsa DATABASE_URL'ni sozlang

createdb platform             # control-plane DB (bir marta)

pnpm gateway:dev              # gateway -> http://localhost:8000 (boshlanishida avto-migratsiya)
pnpm --filter @storagedb/studio dev   # dashboard -> http://localhost:3001
```

Dashboard'ni oching: **http://localhost:3001** — loyiha yarating, SQL Editor'da jadval
tuzing, Jadvallar/Auth/Storage bo'limlarini ko'ring.

## Sinov

```bash
# Sog'liq
curl http://localhost:8000/health

# Loyiha yaratish (anon_key va service_key qaytadi — saqlang!)
curl -X POST http://localhost:8000/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Mening loyiham"}'

# REST API (PostgREST uslubida) — RLS avtomatik qo'llanadi
curl "http://localhost:8000/v1/<REF>/rest/v1/<TABLE>?select=id,title&order=id.desc&limit=10" \
  -H "apikey: <ANON_KEY>"

# Insert
curl -X POST "http://localhost:8000/v1/<REF>/rest/v1/<TABLE>" \
  -H "apikey: <SERVICE_KEY>" -H 'Content-Type: application/json' \
  -d '{"title":"Salom"}'

# Filtrlar: ?col=eq.x · gt · gte · lt · lte · like · ilike · in.(a,b) · is.null
# Update:  PATCH ...?id=eq.1   Delete: DELETE ...?id=eq.1
```

> **RLS:** har so'rov tranzaksiyada `SET LOCAL ROLE` + `request.jwt.claims` o'rnatadi,
> shuning uchun Postgres RLS siyosatlari va `auth.uid()`/`auth.role()` ishlaydi.
> `service_role` RLS'ni chetlab o'tadi (BYPASSRLS).

## Auth, Storage, Realtime — qisqa namunalar

```bash
# AUTH: ro'yxatdan o'tish (access + refresh token qaytadi)
curl -X POST "http://localhost:8000/v1/<REF>/auth/v1/signup" \
  -H "apikey: <ANON_KEY>" -H 'Content-Type: application/json' \
  -d '{"email":"ali@example.com","password":"parol123"}'

# STORAGE: bucket + yuklash + signed URL
curl -X POST "http://localhost:8000/v1/<REF>/storage/v1/bucket" \
  -H "apikey: <SERVICE_KEY>" -H 'Content-Type: application/json' -d '{"id":"rasmlar","public":true}'
curl -X POST "http://localhost:8000/v1/<REF>/storage/v1/object/rasmlar/a.png" \
  -H "apikey: <SERVICE_KEY>" --data-binary @a.png
# public: http://localhost:8000/v1/<REF>/storage/v1/public/rasmlar/a.png

# REALTIME: jadvalga trigger qo'shing, keyin WS orqali tinglang
#   SQL: select realtime.enable('public.todos');
#   WS:  ws://localhost:8000/v1/<REF>/realtime/v1/websocket?apikey=<ANON_KEY>
#        -> {"type":"subscribe","table":"todos"}
```

## Production (VPS + Docker)

```bash
# .env'da PLATFORM_SECRET, PLATFORM_ADMIN_TOKEN, POSTGRES_PASSWORD ni o'zgartiring!
docker compose -f docker/docker-compose.prod.yml up -d --build
# gateway :8000, studio :3001, postgres (wal_level=logical)
```

Xavfsizlik: helmet headerlari, IP bo'yicha rate-limit (300/min), parollar scrypt bilan
hashlanadi, har loyiha alohida DB + authenticator rolda izolyatsiya qilinadi.

## Skriptlar

| Buyruq | Vazifa |
|---|---|
| `pnpm db:migrate` | control-plane migratsiyalari (gateway boshlanishida ham avtomatik) |
| `pnpm gateway:dev` | gateway (watch rejimi) |
| `pnpm --filter @storagedb/studio dev` | dashboard |
| `pnpm -r typecheck` | barcha paketlarni typecheck |
| `pnpm -r test` | unit testlar (sql-builder) |

## Cheklovlar (kelajakda)

- Realtime v1: per-row RLS broadcast'da qo'llanmaydi (faqat `realtime.enable` qilingan jadvallar).
- REST: embedded join (FK orqali `select=*,boshqa(*)`) hali yo'q.
- Auth: OAuth (Google/GitHub) va email (SMTP) keyingi bosqichда.
