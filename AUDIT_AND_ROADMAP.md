# storagedb — Audit & Rivojlanish Rejasi

> Sana: 2026-06-07 · Usul: 3 parallel chuqur audit (backend/xavfsizlik, frontend/UX, Supabase-parity), har topilma kodda `file:line` bilan tasdiqlangan.
> Maqsad: shaxsiy/jamoa ko'p-loyiha BaaS (public SaaS emas — billing/multi-org SKIP).

---

## ✅ Bajarildi (3 deploy — 2026-06-07)

- **Faza 1 (P0 xavfsizlik):** RLS secure-by-default (event trigger; local PG17'da tasdiqlangan) · autentifikatsiyasiz `POST /v1/projects` olib tashlandi · filtrsiz PATCH/DELETE taqiqlandi · frontend xato handling (`res.ok` + toast).
- **Faza 2 (correctness):** upsert (`ON CONFLICT`) endi ishlaydi · pool LRU eviction (MAX 50) · platform pool `statement_timeout` · mutatsiyalarda `or=` filtr.
- **Faza 3 (Studio UX):** toast/confirm/prompt tizimi (barcha native dialog almashtirildi) · Table Editor pagination + qator o'chirish · storage fayl o'chirish + bucket modal · xavfsiz clipboard · a11y (kontrast/aria/scope) · mobil moslashuv (tool-panellar stack).
- **SDK/docs:** `db.meta.query()` + Meta/DDL hujjatlari. **UI:** premium light+dark redizayn.

**Hali qoldi (keyingi sessiyalar):** RLS policy editor UI · loyiha rename/**delete** UI (DELETE destructive — ehtiyotkorlik bilan) · cell-edit/sort · API-key revocation + `PLATFORM_SECRET` ajratish · ban-at-request · OAuth · pgvector · webhooks+cron · SDK session persistence · storage policy/list/S3 · backup UI · realtime multi-node. Tafsilot — quyidagi Faza 4/5.

---

## TL;DR — eng muhim 6 ta

| # | Muammo | Tur | Joy |
|---|--------|-----|-----|
| 1 | **RLS default O'CHIQ + `anon`ga GRANT ALL** — yangi jadval public `anon` kalitiga ochiq, docs esa "RLS avtomatik" deb yolg'on yozadi | 🔴 P0 xavfsizlik | `packages/db/src/provisioner.ts:183` |
| 2 | **`POST /v1/projects` autentifikatsiyasiz** — istalgan kishi cheksiz DB yaratadi (DoS) | 🔴 P0 | `apps/gateway/src/index.ts:90` |
| 3 | **Filtrsiz PATCH/DELETE butun jadvalni o'chiradi** (service_role) | 🔴 P0 data-loss | `packages/rest/src/index.ts:264` |
| 4 | **Frontend xatolarni yutadi** — `(await res.json()).error` bo'sh body'da throw; ban/delete `res.ok` tekshirmaydi → jim muvaffaqiyatsizlik | 🔴 P0 UX | `tables/page.tsx:97`, `auth/page.tsx:66` |
| 5 | **Upsert ishlamaydi** — SDK+docs va'da beradi, lekin server `ON CONFLICT` chiqarmaydi | 🟠 P1 ishonch | `packages/rest/src/index.ts` `buildInsert` |
| 6 | **`PLATFORM_SECRET` haddan ortiq qayta ishlatilgan** (DB parol + JWT shifr + signed-URL) va DB parollari undan deterministik | 🟠 P1 xavfsizlik | `packages/db/src/roles.ts:10` |

---

## 1. Backend — xavfsizlik & correctness

### 🔴 P0
- **RLS secure-by-default emas** (`provisioner.ts:183`): bootstrap `anon/authenticated/service_role`ga default-privilege `GRANT ALL` beradi, yangi jadvalga RLS yoqilmaydi. Natija: har loyihada `anon` kalit bilan **butun jadval o'qiladi/yoziladi**. **Yechim:** `CREATE TABLE`'da event-trigger orqali avtomatik `ENABLE ROW LEVEL SECURITY` + default deny, yoki default'da faqat `service_role`ga grant. + docsdagi noto'g'ri da'voni tuzatish (`lib/docs.ts:45,55,338`).
- **`POST /v1/projects` auth yo'q** (`index.ts:90`): cheksiz loyiha/DB yaratish (resurs DoS), egasiz loyihalar. **Yechim:** `/admin/projects` kabi `requireAuth`+super_admin gate (yoki bu public route'ni o'chirish).
- **Filtrsiz PATCH/DELETE** (`rest/src/index.ts:264`): WHERE bo'lmasa butun jadval. service_role BYPASSRLS → to'liq o'chish/yozish. **Yechim:** PATCH/DELETE uchun kamida 1 ta filtr majburiy (yoki explicit header).

### 🟠 P1
- **Upsert non-functional**: `Prefer: resolution=merge-duplicates` e'tiborsiz qoldiriladi, `ON CONFLICT` yo'q → PK to'qnashuvda 409. **Yechim:** `buildInsert`'ga `on_conflict` + `ON CONFLICT DO UPDATE/NOTHING`.
- **`PLATFORM_SECRET` overload + deterministik DB parol** (`roles.ts:10`, `crypto.ts`, `storage.ts:207`): bitta sirning sizishi = barcha loyiha DB credential + barcha JWT shifr + signed-URL. **Yechim:** random per-project DB parol (control-plane'da shifrlangan), sirlar uchun alohida kalitlar.
- **10-yillik bekor qilib bo'lmaydigan kalitlar** (`jwt/src/index.ts:122`): sizgan `service_key`ni faqat `jwt_secret` rotatsiyasi o'ldiradi (hamma sessiyani buzadi). **Yechim:** per-project key-version/denylist `verifyJwt`'da.
- **Bloklangan user ~1 soat ishlaydi** (`auth/index.ts:226`): ban faqat refresh tokenni bekor qiladi, access JWT amal qiladi. **Yechim:** `banned_until`'ni so'rov vaqtida tekshirish yoki access TTL'ni qisqartirish.
- **Unbounded per-project pool** (`projectPool.ts:8`): har ko'rilgan ref uchun pool, hech eviction yo'q → minglab loyiha = connection exhaustion. **Yechim:** LRU/TTL eviction.
- **Realtime single-node + per-subscriber RLS re-query** (`realtime/src/index.ts`): >1 gateway'da broadcast/presence fan-out yo'q; har o'zgarishda har obunachi uchun DB so'rov (write-amplification). **Yechim:** Redis/PG pub-sub bus + visibility batch; yoki "single-node only" deb hujjatlash.
- **Auth endpointlarda brute-force himoyasi zaif** (`index.ts:52`): faqat global 300/min/(IP+key); login/token/recover'da account-lockout yo'q. **Yechim:** account-scoped qattiq limit.
- **Ichki PG xatolar clientga sizadi** (`rest/errors.ts:41`, `admin.ts:237`): schema/constraint nomlari. **Yechim:** anon/authenticated uchun generic xabar.
- **CORS default `*`** faqat `NODE_ENV=production`'da bloklanadi (`config:47`): NODE_ENV esdan chiqsa ochiq. **Yechim:** fail-closed.
- **`POST /v1/projects` orfan + `/metrics` auth yo'q** (yuqorida) + 50MB catch-all body parser memory'ga buferlaydi (`index.ts:32`). **Yechim:** upload'ni stream qilish, katta body'ni faqat storage route'ga.

### 🟡 P2/P3 (qisqa)
- Refresh-token reuse-detection yo'q + GC yo'q (`auth/index.ts:253`).
- 206/Content-Range mantiq xato (`rest/index.ts:239`).
- PUT = partial PATCH (replace emas).
- `in.()` vergulni naive split qiladi.
- Heterogen bulk insert birinchi qator kalitlaridan ustun oladi.
- Platform pool/provisioner'da `statement_timeout` yo'q.
- Super-admin seed paroli = `PLATFORM_ADMIN_TOKEN` (header bypass hech qachon eskirmaydi).

---

## 2. Frontend / Studio — UX & sifat

### 🔴 P0 / 🟠 P1
- **Table Editor faqat o'qish+insert** (`data-grid.tsx`, `tables/page.tsx`): cell edit yo'q, row delete yo'q, pagination yo'q (`limit 100` qattiq), sort/filter yo'q, DDL UI yo'q. Bayroqdor funksiya ma'lumotni boshqara olmaydi. **Yechim:** inline cell edit (PATCH), row delete (DELETE), pagination+`count`, header sort, filter qatori.
- **Xatolar jim yutiladi** (global): write yo'llari `(await res.json()).error` ishlatadi (bo'sh body → throw → hech narsa ko'rinmaydi); `toggleBan/deleteUser` `res.ok` tekshirmaydi. **Yechim:** hamma yozuvni `jsonOrThrow`'ga o'tkazish.
- **Toast/dialog tizimi yo'q** — native `alert/confirm/prompt` (`storage:72`, `auth:77`, `users:86`, `sql:103`). Har muvaffaqiyat jim, har confirm stilsiz. **Yechim:** toast provider (sonner) + reusable confirm modal.
- **Mobile butunlay buzilgan**: `/project/[ref]` shell `flex h-screen`+`w-16` rail, drawer yo'q; tables/sql/storage `w-60`/`w-80` panellar reflow qilmaydi. **Yechim:** `md` ostida rail→drawer, panellarni stack qilish.
- **RLS policy editor UI yo'q** — RLS bayroqdor funksiya, lekin faqat raw SQL. **Yechim:** per-table policy paneli (`pg_policies` + DDL).
- **Loyiha rename/delete + API-key regenerate UI yo'q** (settings read-only). **Yechim:** Danger Zone + key rotation.
- **Private fayl yuklab olib bo'lmaydi** (`storage:192`) — signed URL yo'q. **Yechim:** private bucket'da click→signed URL.
- **Logs/so'rov ko'ruvchi yo'q** — faqat agregat metrika. **Yechim:** Logs sahifa + `/admin/logs`.

### 🟡 P2 (a11y, session, polish)
- **A11y**: form `label htmlFor`/`id` yo'q; icon tugmalarda `aria-label` yo'q (faqat 2 fayl); `--faint` light'da ~2.6:1 (WCAG AA emas) — `globals.css:18` quyiroq qilish. Focus-trap/Escape yo'q.
- **Session**: token `localStorage`, refresh yo'q, 401 faqat keyingi so'rovda; page-level `fetch`'larda 401 handling yo'q. **Yechim:** bitta fetch-wrapper + refresh.
- **`navigator.clipboard` guard yo'q** — HTTP/LAN'da undefined, reject (`settings:119`, `page:127`, `code-block:26`). **Yechim:** try/catch + `execCommand` fallback.
- `getKeys`/`useEffect [keys]` race (stale overwrite) — primitive (`keys?.service_key`) ga bog'lash.
- Dead kod `components/rows-table.tsx` — o'chirish.
- Hardcoded `text-red-400` (token emas) bir necha joyda → `text-danger`.
- ⌘K command palette yo'q; keyboard shortcut faqat ⌘↵.
- SQL editor — oddiy `<textarea>` (CodeMirror emas), result export yo'q, snippet faqat localStorage.

---

## 3. Supabase bilan farq (parity)

**Bizda BOR (✓):** PostgREST-mos REST (filtrlar, embedded joins, count, RPC, full-text), Auth (email/parol, JWT, refresh rotatsiya, email confirm/recovery, admin CRUD), Storage (public/private bucket, signed URL, disk), Realtime (postgres changes **per-row RLS bilan**, broadcast, presence), TS SDK, type-gen, Swagger UI, Docker/CI/CD, Prometheus+Grafana, multi-project RBAC.

**Eng muhim YETISHMAYDIGAN (8 ta):**
1. **OAuth/social login** (Google, GitHub) — eng ko'p so'raladigan. `L`
2. **Upsert** (REST'da real `ON CONFLICT`) — hozir buzuq, arzon tuzatish. `S`
3. **Table editor yozish/DDL + RLS policy UI** — Studio'ning asosiy qiymati. `L`
4. **pgvector/embeddings** — AI/RAG uchun; extension+`<->` operator. `S–M`
5. **Database webhooks + cron (pg_cron)** — edge functions'ning 80%'ini qoplaydi. `M`
6. **SDK session persistence + auto-refresh + onAuthStateChange** — hozir reload'da logout. `M`
7. **Storage: per-bucket size/MIME policy, `list()` API, S3 backend** — `M`/`L`
8. **Backup+restore dashboard'da (+ jadval)** — hozir faqat shell skript. `M`

**Boshqa gaplar:** magic link, phone/OTP, MFA, anonymous sign-in; image transform, resumable/TUS upload; multi-schema & views REST'da; CLI + migratsiya (db push); connection pooler; PITR; branching; Deno edge functions; logs explorer; schema/ERD viewer.

---

## 4. Rivojlanish rejasi — fazalar

> Tartib: avval xavfsizlik/data-yaxlitlik, keyin ishonchlilik, keyin Studio UX, keyin parity, keyin ilg'or. Har faza mustaqil deploy qilinadi.

### 🔴 Faza 1 — Xavfsizlik & data-yaxlitlik (DARHOL)
1. RLS secure-by-default (auto-enable + deny) + docs tuzatish
2. `POST /v1/projects`'ni gate qilish (yoki o'chirish)
3. PATCH/DELETE uchun filtr majburiy
4. Frontend: hamma yozuvni `jsonOrThrow`'ga, `res.ok` tekshiruvi
5. (bonus) PG xato xabarlarini generic qilish, CORS fail-closed

### 🟠 Faza 2 — Ishonchlilik (correctness + hardening)
6. Upsert (`ON CONFLICT`) — SDK/docs bilan moslash
7. `PLATFORM_SECRET`'ni ajratish: random DB parol (shifrlangan), alohida kalitlar
8. Key revocation (per-project key-version/denylist)
9. Ban'ni so'rov vaqtida tekshirish
10. Pool LRU eviction + platform pool `statement_timeout`
11. Auth endpointlarda account-lockout rate-limit

### 🟢 Faza 3 — Studio UX (bayroqdor)
12. Table Editor: cell edit, row delete, pagination+count, sort, filter
13. Toast + confirm-modal tizimi → barcha native dialog'ni almashtirish
14. RLS policy editor UI (per-table)
15. Loyiha rename/delete + API-key regenerate (Danger Zone)
16. Storage: object delete/rename, private signed-download, drag-drop multi-upload, pagination
17. Mobile responsive (rail→drawer, panellar stack) + a11y (label/aria/contrast/focus)
18. Session: bitta fetch-wrapper, refresh, 401 redirect; clipboard fallback
19. Logs sahifa (`/admin/logs`)

### 🔵 Faza 4 — Platforma imkoniyatlari (parity)
20. OAuth (Google, GitHub) + `auth.identities`
21. pgvector (extension + `<->` operator + type-gen)
22. Database webhooks + pg_cron
23. SDK: session persistence + auto-refresh + `onAuthStateChange`
24. Storage: per-bucket policy (size/MIME), `list()` API, (keyin) S3 backend
25. Magic link + anonymous sign-in
26. Backup/restore dashboard + jadval
27. ⌘K command palette; SQL editor CodeMirror

### ⚪ Faza 5 — Ilg'or (keyinroq)
28. CLI + user-schema migratsiya (db push/diff)
29. Connection pooler (Supavisor/PgBouncer) + foydalanuvchiga DB connection string
30. Multi-schema & views REST'da
31. Realtime horizontal scaling (Redis bus) + broadcast/presence authorization
32. PITR (WAL archiving), branching, Deno edge functions, MFA/phone, schema/ERD viewer

---

## 5. Tezkor g'alabalar (birinchi sprint — yuqori ta'sir / past mehnat)

- [x] `POST /v1/projects` olib tashlandi (P0)
- [x] PATCH/DELETE filtr majburiy (P0)
- [x] Frontend yozuvlarda `res.ok` + xato handling (P0)
- [x] Upsert `ON CONFLICT` (P1) — buzuq funksiya tuzatildi
- [x] RLS auto-enable event trigger + docs tuzatish (P0)
- [x] `--faint`/`--muted` kontrast oshirildi (a11y)
- [x] `components/rows-table.tsx` dead kod o'chirildi
- [x] `navigator.clipboard` fallback (`copyText`)
- [ ] Ban'ni so'rov vaqtida tekshirish (P1) — keyingi sessiya (caching kerak)

---

*Manba fayllar: `apps/gateway/src/{index,rest,auth,storage,realtime,admin,meta-spec,platform-users}.ts`, `packages/{rest,sql-builder,auth,storage,realtime,db,config,client}/src`, `apps/studio/app/**`, `apps/studio/lib/{api,docs}.ts`.*
