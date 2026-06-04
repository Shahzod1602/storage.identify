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

## Client SDK (`@storagedb/client`) — supabase-js kabi

```ts
import { createClient } from "@storagedb/client";
const db = createClient("http://localhost:8000/v1/<REF>", "<ANON_KEY>");

// Database (filtrlar, count, embedded joins)
const { data, count } = await db.from("todos").select("*", { count: "exact" })
  .eq("done", false).order("id").limit(20);
await db.from("todos").insert({ title: "Salom" });
await db.from("todos").update({ done: true }).eq("id", 1);

// Auth (signUp keyin avtomatik authenticated)
await db.auth.signUp({ email: "a@b.com", password: "123456" });
await db.auth.signInWithPassword({ email: "a@b.com", password: "123456" });

// RPC (Postgres funksiya)
const { data: sum } = await db.rpc("qoshish", { a: 5, b: 7 });

// Storage
await db.storage.from("rasmlar").upload("a.png", file);

// Realtime: postgres changes + broadcast + presence
const ch = db.channel("room1")
  .on("INSERT", (p) => console.log(p.record))       // DB o'zgarishlari
  .onBroadcast("cursor", (m) => console.log(m.payload)) // mijoz↔mijoz
  .onPresenceSync(() => ch.presenceState())          // kim onlayn
  .subscribe();
ch.send("cursor", { x: 10 });
ch.track({ user: "ali" });

// Admin (service_key bilan): foydalanuvchi boshqaruvi
await db.auth.admin.listUsers();
await db.auth.admin.updateUserById(id, { banned: true });
await db.auth.admin.deleteUser(id);
```

## Qo'shimcha REST filtrlar + API docs

```bash
# JSON path:   ?meta->>author=eq.Ali
# Full-text:   ?body=wfts.olma     (websearch)
# Inkor:       ?views=not.gt.10
# OR:          ?or=(views.gt.90,views.lt.10)
# OpenAPI:     GET /v1/<REF>/openapi.json?apikey=<anon>
# Swagger UI:  /v1/<REF>/docs?apikey=<anon>
# TS types:    GET /admin/projects/<REF>/types  (x-admin-token)
```

## REST qo'shimcha imkoniyatlar

```bash
# Embedded joins (FK): har kitob muallifi bilan
curl ".../rest/v1/kitoblar?select=*,mualliflar(*)" -H "apikey: ..."
# RPC: Postgres funksiya
curl -X POST ".../rest/v1/rpc/qoshish" -d '{"a":5,"b":7}'
# Count + pagination: Content-Range: 0-9/100
curl -D - ".../rest/v1/items?limit=10&count=exact"
```

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

## Production (VPS + Docker + HTTPS)

```bash
# 1. Kuchli secretlar generatsiya qiling
./scripts/gen-secrets.sh >> .env
# 2. .env'da domenlarni qo'shing: API_DOMAIN, STUDIO_DOMAIN, GATEWAY_CORS_ORIGINS
# 3. Ishga tushiring (Caddy avtomatik Let's Encrypt HTTPS beradi)
docker compose -f docker/docker-compose.prod.yml up -d --build
# caddy :443 (HTTPS) → gateway/studio; postgres ichki tarmoqda
```

## Xavfsizlik (Tier 0 — production-ready)

- **HTTPS** — Caddy reverse-proxy, avtomatik Let's Encrypt sertifikat (`docker/Caddyfile`)
- **Secret guard** — `NODE_ENV=production`da default/zaif secretlar **rad etiladi**
- **`jwt_secret` shifrlangan** — control-plane DB'da AES-256-GCM (`enc:` prefiks); DB o'g'irlansa ham ochilmaydi
- **Realtime RLS** — har obunachi faqat o'zining RLS siyosati ko'rsatadigan qatorlarni oladi (ma'lumot sizmaydi)
- **SQL timeout** — `STATEMENT_TIMEOUT_MS` (default 15s) osilib qolgan so'rovlarni to'xtatadi
- **Per-key rate-limit** — har (IP + apikey) alohida; CORS `GATEWAY_CORS_ORIGINS` bilan cheklanadi
- helmet headerlari, scrypt parol hashing, har loyiha alohida DB + authenticator izolyatsiya

## Monitoring (Grafana + Prometheus)

Studio'da har loyiha uchun **Hisobotlar** sahifasi (jonli request/latency/DB hajmi).
To'liq tarixiy grafiklar + server CPU/RAM uchun Grafana stack:

```bash
# Prod stack ishlab turganda (bir xil 'storagedb' tarmoqda):
docker compose -f docker/docker-compose.observability.yml up -d
# Grafana → http://<server>:3002 (admin / GRAFANA_PASSWORD), dashboard avtomatik yuklanadi
```

Gateway `/metrics` (Prometheus) — per-loyiha `sdb_http_requests_total`,
`sdb_http_request_duration_seconds`, `sdb_project_db_bytes`, `sdb_realtime_connections`;
node-exporter (server CPU/RAM/disk) + postgres-exporter (DB).

> Eslatma: hamma loyiha bitta jarayonni baham ko'rgani uchun **aniq per-loyiha CPU/RAM**
> hozircha yo'q (proxy: DB hajmi, request, latency). Buning uchun per-loyiha izolyatsiya
> (cgroups/konteyner) kerak — yo'l xaritasida.

## Backup / Restore

```bash
PG_BIN=/opt/homebrew/opt/postgresql@17/bin/ ./scripts/backup.sh   # platform + proj_* + rollar + storage
./scripts/restore.sh ./backups/<timestamp>                        # tiklash
# Avtomatik: crontab -e → 0 3 * * * cd /path && ./scripts/backup.sh
# Offsite:  OFFSITE=user@host:/backups ./scripts/backup.sh
```

## Skriptlar

| Buyruq | Vazifa |
|---|---|
| `pnpm db:migrate` | control-plane migratsiyalari (gateway boshlanishida ham avtomatik) |
| `pnpm gateway:dev` | gateway (watch rejimi) |
| `pnpm --filter @storagedb/studio dev` | dashboard |
| `pnpm -r typecheck` | barcha paketlarni typecheck |
| `pnpm -r test` | unit testlar (sql-builder) |

## Cheklovlar (kelajakda)

- Auth: OAuth (Google/GitHub), MFA/2FA keyingi bosqichда (email/parol tiklash + admin user mgmt BOR).
- Storage: S3/MinIO backend, resumable upload, rasm transform keyingi bosqichда (local disk + signed URL BOR).
- Realtime broadcast/presence bitta node uchun (ko'p node = Redis pub/sub kerak).
- Edge Functions (serverless) va pgvector (AI) hozircha yo'q.
