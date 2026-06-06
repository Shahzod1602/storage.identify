# storagedb — Design Generation Prompt

> Paste into **v0 / Lovable / Bolt**. Aesthetic: **premium modern SaaS** (Linear / Vercel / Resend).
> Themes: **light + dark**. Stack: **Next.js 15 (App Router) · React 19 · Tailwind · lucide-react · Geist font**.
> **All visible UI copy is in Uzbek** (strings provided in §7). Instructions are in English on purpose — these tools respond best to English.

---

## How to use this
1. Paste **§1–§4** first (context + design system). Let the tool scaffold tokens, theme provider, and core components.
2. Then paste **one screen at a time** from **§5** to build incrementally.
3. Keep **§6 (Do / Don't)** in context the whole time — it's what stops the output from looking AI-generic.

---

## 1. Product context

**storagedb** is a self-hosted, multi-tenant Supabase alternative (Backend-as-a-Service). One server hosts many projects; each project gets a Postgres DB, auto REST API, Auth, Storage, and Realtime. There's a **marketing site**, an **auth flow**, a **multi-project dashboard**, a **per-project studio** (table/SQL/auth/storage/reports/settings), a **developer docs** site, and **RBAC user management** (super admin + users).

Audience: developers and technical founders who want to own their data. Tone: confident, precise, calm — "serious infrastructure," not playful.

---

## 2. Design direction — the vibe

Build it like **Linear × Vercel × Resend**:

- **Restraint over decoration.** Near-monochrome neutral palette, a single emerald accent used sparingly. Color is earned, not sprinkled.
- **Editorial typography.** Big, tight, confident headings (negative letter-spacing). Clear type scale. Geist Sans for UI, Geist Mono for anything code/keys/IDs.
- **Generous, intentional whitespace.** The product should feel expensive and unhurried. Dense only where data demands it (tables, editors).
- **Quiet surfaces, crisp borders.** Hairline 1px borders (very low contrast), barely-there shadows in light mode, borders-not-shadows in dark mode. No heavy drop shadows, no glassmorphism overload.
- **Subtle depth.** One faint emerald radial glow in the hero; a fine dotted/grid texture at ~4% opacity. Nothing more.
- **Fast, small motion.** 150ms `cubic-bezier(.4,0,.2,1)`. Hover states are subtle (border brightens, 1px lift, bg shifts one step). No bounce, no long fades.
- **Keyboard-first product feel.** Command palette (⌘K), visible `kbd` shortcuts, focus rings that look designed.
- **Rounded but not bubbly.** 8–12px radii. Pills only for badges/tags.

---

## 3. Design tokens

Drop these into `globals.css`. Light is `:root`, dark is `.dark`. Map them in `tailwind.config`.

```css
:root {
  /* surfaces */
  --background: #ffffff;
  --surface:    #fafafa;   /* alternating sections, sidebars */
  --card:       #ffffff;
  --popover:    #ffffff;
  --overlay:    rgba(10,10,10,.45);

  /* lines */
  --border:        #ebebeb;  /* hairline */
  --border-strong: #d9d9d9;  /* inputs, dividers that must read */

  /* text */
  --foreground: #0a0a0a;
  --secondary:  #5c5c5c;
  --muted:      #8a8a8a;
  --faint:      #b3b3b3;

  /* brand — refined emerald */
  --primary:            #10b981;
  --primary-hover:      #059669;
  --primary-foreground: #ffffff;
  --primary-subtle:     #ecfdf5;  /* tinted bg for badges/active */
  --primary-ring:       rgba(16,185,129,.30);

  /* status */
  --danger:  #e5484d;
  --warning: #d9890a;
  --info:    #3b82f6;

  /* radius + shadow */
  --radius: 10px;
  --shadow-sm: 0 1px 2px rgba(10,10,10,.05);
  --shadow-md: 0 4px 14px -4px rgba(10,10,10,.10);
  --shadow-lg: 0 16px 40px -12px rgba(10,10,10,.16);
}

.dark {
  --background: #0a0a0a;
  --surface:    #0f0f0f;
  --card:       #141414;
  --popover:    #161616;
  --overlay:    rgba(0,0,0,.60);

  --border:        #1f1f1f;
  --border-strong: #2c2c2c;

  --foreground: #fafafa;
  --secondary:  #a1a1aa;
  --muted:      #71717a;
  --faint:      #52525b;

  --primary:            #34d399;  /* a touch brighter so it sings on black */
  --primary-hover:      #6ee7b7;
  --primary-foreground: #04130d;
  --primary-subtle:     rgba(52,211,153,.12);
  --primary-ring:       rgba(52,211,153,.32);

  --danger:  #f4666b;
  --warning: #e7a33e;
  --info:    #60a5fa;

  --shadow-sm: 0 1px 2px rgba(0,0,0,.4);
  --shadow-md: 0 6px 20px -6px rgba(0,0,0,.5);
  --shadow-lg: 0 20px 48px -16px rgba(0,0,0,.6);
}
```

**Type scale** (Geist Sans; Geist Mono for code/keys/IDs):
`display 56/1.05 -0.03em` · `h1 40/1.1 -0.025em` · `h2 30/1.2 -0.02em` · `h3 22/1.3` · `h4 18` · `body 15/1.6` · `small 13` · `micro 12` · `mono 13`. Headings use `font-weight: 600`, never 700+.

**Spacing:** 4px base grid. Page gutters: 24px mobile / 32–48px desktop. Marketing max-width `1120px`. App content max-width `1200px`. Section vertical rhythm on marketing: `96–128px`.

---

## 4. Core components

Build these as reusable components first, themed via the tokens above:

- **Button** — variants: `primary` (solid emerald, white text), `secondary` (card bg + `--border-strong`, hover bg shift), `ghost` (transparent, hover bg), `danger`. Sizes sm/md. Radius 8px. 150ms transitions. Optional leading lucide icon at 15–16px.
- **Input / Textarea / Select** — bg `--background` (light) / `--card` (dark), `--border-strong`, focus = emerald border + `2px` ring `--primary-ring`. 13–14px text. Label above, helper/error below.
- **Card** — `--card` bg, `--border` hairline, radius 12px, `--shadow-sm` (light only). Optional header row with title + actions.
- **Badge / Tag** — pill, `--primary-subtle` bg for brand, neutral variant for status. 11–12px, mono for IDs.
- **Table** — Linear-style data grid: sticky header (`--surface`), hairline row dividers, row hover, monospace cells for IDs/timestamps, right-aligned numerics, zebra OFF (use hover only). Empty + loading (skeleton) states.
- **Sidebar / app shell** — see §5.3.
- **Topbar** — breadcrumb left, search/⌘K center-or-right, theme toggle + avatar right.
- **Command palette (⌘K)** — centered modal, fuzzy list, sections (Navigation / Actions / Projects), `--overlay` backdrop with blur.
- **Toast** — bottom-right, `--card`, hairline border, status icon, auto-dismiss.
- **Modal / Drawer** — drawer slides from right for forms (insert row, invite user); modal centered for confirmations.
- **Tabs, Tooltip, Dropdown menu, Switch, Theme toggle** — minimal, token-driven.
- **Code block** — Geist Mono, `--surface` bg, hairline border, copy button, language tab, soft syntax highlight (comments `--muted`, strings/keywords get muted emerald/blue — never neon).

---

## 5. Screens

> Every screen: responsive, light+dark, Uzbek copy from §7, lucide icons, the §6 rules.

### 5.1 Marketing landing (`/`)
- **Nav** (sticky, blurred, hairline bottom): wordmark `storagedb` with a small emerald mark, links `Mahsulot · Docs · GitHub`, theme toggle, `Kirish` (ghost) + `Dashboard →` (primary).
- **Hero**: one faint emerald radial glow top-center + ~4% dotted grid. Eyebrow badge ("Self-hosted · Open source"), big display headline **"Backend — sizning serveringizda."**, one-line subhead, primary CTA `Boshlash` + secondary `Demo →`. Below: a single high-fidelity product screenshot/mock (the dashboard) in a bordered, slightly-tilted frame with soft shadow.
- **Trust strip**: muted "Postgres · TypeScript · Docker" lockups, low contrast.
- **Feature grid** (6, 2–3 cols): Postgres + REST · Authentication · Storage · Realtime · Dashboard · Client SDK. Each = small emerald-tinted icon tile, title, one-line desc. Cards with hairline borders, hover lifts 1px.
- **Code showcase**: tabbed code block (Database / Auth / Realtime / Storage) on `--surface`, with a short explainer column beside it. Use the SDK snippet style (`db.from("todos").select(...)`).
- **"Nega self-host?"**: 3-up — O'z serveringizda · Xavfsiz (RLS) · Supabase-mos. Icon + title + line.
- **Comparison row** (optional): subtle table storagedb vs managed cloud (data ownership, narx, lock-in).
- **CTA band**: full-width `--surface`, centered headline + primary button, faint glow.
- **Footer**: 3–4 link columns (Mahsulot, Hujjatlar, Loyiha, Aloqa), wordmark, copyright, theme toggle. Hairline top border.

### 5.2 Login / Signup (`/login`)
- Split layout: **left** = form panel (`--background`); **right** = branded panel (`--surface`) with the emerald glow, wordmark, and a rotating one-line value prop or a faint product mock. On mobile, form only.
- Form card: title `Hisobingizga kiring`, email + password inputs, primary `Kirish`, link to signup, subtle error states. Optional "OAuth / SSO" buttons as secondary. Keep it tight and centered, max-width ~380px.

### 5.3 App shell (project layout `/project/[ref]`)
Replace the bare 56px icon rail with a **refined collapsible sidebar**:
- **Left sidebar** (~240px, collapses to 56px icons): top = **project switcher** dropdown (current project name + chevron). Nav groups with labels + icons: `Umumiy`, `Table Editor`, `SQL Editor`, `Authentication`, `Storage`, `Hisobotlar`, then pinned bottom `Sozlamalar`. Active item: `--primary-subtle` bg + emerald left-bar + emerald icon. Sidebar bg `--surface`, hairline right border.
- **Topbar**: breadcrumb (`Loyiha / Table Editor`), `⌘K` search button, theme toggle, avatar menu (profil, super admin, chiqish).
- **Content area**: `--background`, generous padding, max-width 1200px for non-grid pages; full-bleed for editor/grid pages.

### 5.4 Dashboard — projects (`/dashboard`)
- Topbar: org/wordmark, search, theme toggle, avatar.
- Header row: `Loyihalar` title + `Yangi loyiha` primary button + view toggle (grid/list) + search.
- **Project cards** (grid): project name, ref id (mono, copyable), region/status dot, tiny usage sparkline, created date, hover lift. Click → project overview.
- **Empty state**: centered illustration-lite, "Hali loyiha yo'q", primary CTA.
- Create-project flow as a right-side **drawer** or modal: name, (optional) region, primary `Yaratish`.

### 5.5 Users — RBAC (`/dashboard/users`)
- Header: `Foydalanuvchilar` + `Taklif qilish` primary.
- **Table**: avatar+name, email, role badge (`Super admin` / `Admin` / `User`), owner-of (project chips), last active, status. Row actions menu (rolni o'zgartirish, o'chirish). Mono email, relative timestamps.
- Invite drawer: email + role select + primary `Taklif yuborish`. Super-admin-only actions clearly gated/labeled.

### 5.6 Project overview — "Umumiy" (`/project/[ref]`)
- Page title + project ref.
- **Connection card**: API URL, `anon` key, `service_role` key (masked + reveal + copy, mono). Warning note on service key.
- **Stat cards row**: DB hajmi, So'rovlar (24s), Foydalanuvchilar, Storage hajmi — number + tiny trend.
- **Quick links** grid to Table/SQL/Auth/Storage. Recent activity list (optional).

### 5.7 Table Editor (`/project/[ref]/tables`)
- Three-pane, full-bleed: **left** = table list (search + `select`able schema), **center** = data grid, plus a **toolbar** (table name, `Qator qo'shish` primary, refresh, filter, sort, column visibility).
- **Grid**: sticky header with column name + type chip (mono, uppercase, faint), hairline cells, row hover, inline selection checkbox col, pagination footer (row count + page).
- **Insert row** = right drawer: one field per column, type-aware inputs, primary `Saqlash`. Error toast on failure.

### 5.8 SQL Editor (`/project/[ref]/sql`)
- **Top**: query tabs / saved queries, `Ishga tushirish ⌘↵` primary, format button.
- **Editor**: monospace, line numbers, soft syntax highlight, `--surface` bg, hairline border, comfortable line-height.
- **Results panel** (resizable, below): result grid OR message ("N qator, Xms"), error state in `--danger`. Empty state prompt.
- Left rail (optional): saved snippets / schema browser.

### 5.9 Authentication (`/project/[ref]/auth`)
- Tabs: `Foydalanuvchilar` · `Provayderlar` · `Email shablonlar` · `Sozlamalar`.
- Users table: email, provider, tasdiqlangan (badge), oxirgi kirish, yaratilgan. Row actions (parol tiklash, o'chirish, ban).
- Providers: list with switches (Email/Parol on, others toggle). Settings: JWT expiry, redirect URLs, etc. — clean form sections with helper text.

### 5.10 Storage (`/project/[ref]/storage`)
- **Left**: bucket list (`Yangi bucket`), public/private badge.
- **Main**: breadcrumb path + **file browser** (grid of file/folder tiles OR list), upload dropzone (`Fayl yuklash`), search.
- File click → right **detail drawer**: preview/thumbnail, size, type, created, public URL / signed URL (copy), download, delete.

### 5.11 Reports — "Hisobotlar" (`/project/[ref]/reports`)
- Header: title + **date-range picker** (24s / 7k / 30k) + refresh.
- **Chart cards** grid: API so'rovlari (line/area), o'rtacha latency, Storage o'sishi, Auth hodisalari. Emerald single-series lines, hairline gridlines, muted axes, big number + delta above each chart. Tasteful, not dashboard-soup.

### 5.12 Settings (`/project/[ref]/settings`)
- Left **section nav** (Umumiy, API kalitlari, Ma'lumotlar bazasi, A'zolar, Xavf zonasi) + right content.
- Form sections in cards: project name (rename), keys (regenerate, copy, masked), DB connection string, pause/restart.
- **Xavf zonasi**: `--danger`-bordered card, "Loyihani o'chirish" with type-to-confirm modal.

### 5.13 Docs (`/docs`, `/docs/[slug]`)
- **3-column**: left = grouped nav (collapsible sections), center = article (max-width ~720px, editorial type, anchored headings), right = "Ushbu sahifada" TOC (sticky).
- Top: docs search (⌘K), version/theme toggle.
- Article styling: clear h2/h3 rhythm, `--surface` callout boxes (note/warning/tip with colored left border + icon), code blocks with copy + language tab, prev/next footer nav. Inline `code` chips with hairline border.

---

## 6. Do / Don't — keep it premium, not AI-generic

**Do**
- Hairline 1px borders everywhere; let borders (not shadows) define structure in dark mode.
- One emerald accent, used for primary action + active state only. Everything else neutral.
- Tight, confident headings with negative letter-spacing.
- Monospace for keys, IDs, timestamps, code — it signals "infra."
- Real empty / loading / error states for every data view (skeletons, not spinners where possible).
- Visible keyboard affordances (`kbd` chips, ⌘K).
- Consistent 4px spacing grid and radius scale.

**Don't**
- ❌ No purple-to-pink gradients, no glassmorphism everywhere, no glow on every element.
- ❌ No huge soft drop shadows, no 700+ font weights, no all-caps body text.
- ❌ No three accent colors competing. No neon syntax highlighting.
- ❌ No center-aligned long paragraphs. No emoji as UI icons (use lucide).
- ❌ No generic stock-illustration hero. Show the real product UI instead.
- ❌ Don't over-round (no fully-pill buttons except tags).

---

## 7. Uzbek microcopy (use verbatim)

**Global / nav:** `Mahsulot` · `Hujjatlar` (Docs) · `Kirish` · `Dashboard` · `Chiqish` · `Sozlamalar` · `Qidirish` · `Yangi`

**Landing:** Hero sarlavha: **"Backend — sizning serveringizda."** · Sub: "Postgres, Auth, Storage va Realtime — bitta serverda, to'liq nazoratingizda." · CTA: `Boshlash` / `Demo` · Bo'limlar: "Imkoniyatlar", "Nega self-host?", "Boshlashga tayyormisiz?"

**Features:** `Postgres + REST API`, `Authentication`, `Storage`, `Realtime`, `Dashboard`, `Client SDK`
**Why:** `O'z serveringizda`, `Xavfsiz`, `Supabase-mos`

**Auth:** `Hisobingizga kiring` · `Email` · `Parol` · `Kirish` · `Hisob yaratish` · `Parolni unutdingizmi?`

**App / sidebar:** `Umumiy` · `Table Editor` · `SQL Editor` · `Authentication` · `Storage` · `Hisobotlar` · `Sozlamalar`

**Dashboard:** `Loyihalar` · `Yangi loyiha` · `Yaratish` · `Hali loyiha yo'q` · `Loyiha nomi`
**Users:** `Foydalanuvchilar` · `Taklif qilish` · `Taklif yuborish` · `Rol` · `Super admin` / `Admin` / `Foydalanuvchi` · `Rolni o'zgartirish` · `O'chirish`

**Overview:** `Ulanish` · `API URL` · `anon kalit` · `service_role kalit` · `Nusxa olish` · `Ko'rsatish` · `DB hajmi` · `So'rovlar` · `Storage hajmi`

**Table editor:** `Qator qo'shish` · `Saqlash` · `Yangilash` · `Filtr` · `Saralash` · `Ustunlar` · `qator`
**SQL:** `Ishga tushirish` · `Saqlangan so'rovlar` · `N qator · X ms` · `Xatolik`
**Storage:** `Yangi bucket` · `Fayl yuklash` · `Ommaviy` / `Maxfiy` · `Yuklab olish` · `Havoladan nusxa olish`
**Reports:** `Hisobotlar` · `So'nggi 24 soat` / `7 kun` / `30 kun` · `API so'rovlari` · `Kechikish` · `Auth hodisalari`
**Settings:** `Loyiha nomi` · `API kalitlari` · `Qayta generatsiya` · `Xavf zonasi` · `Loyihani o'chirish`
**Docs:** `Ushbu sahifada` · `Oldingi` / `Keyingi` · `Eslatma` / `Ogohlantirish` / `Maslahat`

---

## 8. Tech constraints
- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, `lucide-react` icons, Geist Sans + Geist Mono (`geist` package).
- Dark mode via `class` strategy + a `ThemeProvider` (persist to `localStorage`, respect `prefers-color-scheme`).
- Components accessible: focus-visible rings, aria labels, keyboard nav, 44px min hit targets on mobile.
- No external UI kit required, but shadcn/ui primitives are fine if it speeds things up — restyle to the tokens above.
