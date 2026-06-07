import Link from "next/link";
import {
  Database,
  KeyRound,
  HardDrive,
  Radio,
  LayoutDashboard,
  Code2,
  ArrowRight,
  Github,
  Server,
  ShieldCheck,
  Zap,
  Check,
  Table2,
  SquareTerminal,
  Users,
  Archive,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getLocale, getDict } from "@/lib/i18n/server";

const FEATURE_ICONS: LucideIcon[] = [
  Database,
  KeyRound,
  HardDrive,
  Radio,
  LayoutDashboard,
  Code2,
];
const WHY_ICONS: LucideIcon[] = [Server, ShieldCheck, Zap];

const SNIPPET = `import { createClient } from "@storagedb/client";

const db = createClient(url, anonKey);

// Database
const { data } = await db.from("todos")
  .select("*, author(*)")
  .eq("done", false);

// Auth
await db.auth.signUp({ email, password });

// Realtime
db.channel("room")
  .on("INSERT", (p) => console.log(p.record))
  .subscribe();`;

const GH = "https://github.com/Shahzod1602/storage.identify";

export default async function LandingPage() {
  const locale = await getLocale();
  const t = getDict(locale).landing;
  const nav = getDict(locale).nav;

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-30 border-b border-border/70 bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Logo />
          <div className="hidden items-center gap-1 md:flex">
            <a href="#imkoniyatlar" className="btn-ghost">
              {nav.product}
            </a>
            <Link href="/docs" className="btn-ghost">
              {nav.docs}
            </Link>
            <a href={GH} target="_blank" className="btn-ghost">
              <Github size={15} /> GitHub
            </a>
          </div>
          <div className="flex items-center gap-1.5">
            <LocaleSwitcher />
            <ThemeToggle />
            <Link href="/login" className="btn-ghost hidden sm:inline-flex">
              {nav.login}
            </Link>
            <Link href="/dashboard" className="btn">
              {nav.dashboard} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <Backdrop />
        <div className="relative mx-auto max-w-3xl px-6 pb-16 pt-24 text-center sm:pt-28">
          <span className="badge badge-brand mb-6 animate-fade-in py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {t.badge}
          </span>
          <h1 className="text-balance text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl">
            {t.heroPre}
            <span className="text-brand">{t.heroHi}</span>
            {t.heroPost}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-secondary">
            {t.heroSub}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/dashboard" className="btn w-full px-5 py-2.5 text-sm sm:w-auto">
              {t.ctaStart} <ArrowRight size={16} />
            </Link>
            <a
              href={GH}
              target="_blank"
              className="btn-default w-full px-5 py-2.5 text-sm sm:w-auto"
            >
              <Github size={16} /> {t.ctaCode}
            </a>
          </div>
          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[13px] text-faint">
            {[t.check1, t.check2, t.check3].map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-brand" /> {c}
              </span>
            ))}
          </p>
        </div>

        <div className="relative mx-auto max-w-5xl px-6 pb-4">
          <StudioMock label={getDict(locale).shell} />
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="border-y border-border bg-surface/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-6 text-sm font-medium text-faint">
          {t.trust.map((x, i) => (
            <span key={x} className="flex items-center gap-x-10">
              {x}
              {i < t.trust.length - 1 && <Dot />}
            </span>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="imkoniyatlar" className="mx-auto max-w-6xl px-6 py-24">
        <SectionHead eyebrow={t.featEyebrow} title={t.featTitle} desc={t.featDesc} />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.map((f, i) => {
            const Icon = FEATURE_ICONS[i]!;
            return (
              <div
                key={f.title}
                className="card group p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-brand/10 text-brand transition group-hover:scale-105">
                  <Icon size={18} />
                </span>
                <h3 className="mt-4 font-medium tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-secondary">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Code + Why ── */}
      <section className="border-y border-border bg-surface/50">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2">
          <div>
            <span className="text-[13px] font-medium uppercase tracking-wider text-brand">
              {t.sdkEyebrow}
            </span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              <code className="rounded-md bg-hover px-1.5 py-0.5 font-mono text-2xl text-fg">
                supabase-js
              </code>
              {t.sdkTitlePre}
            </h2>
            <p className="mt-3 leading-relaxed text-secondary">{t.sdkDesc}</p>
            <div className="mt-8 space-y-5">
              {t.why.map((w, i) => {
                const Icon = WHY_ICONS[i]!;
                return (
                  <div key={w.title} className="flex gap-3.5">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                      <Icon size={16} />
                    </span>
                    <div>
                      <div className="font-medium tracking-tight">{w.title}</div>
                      <div className="mt-0.5 text-sm leading-relaxed text-secondary">
                        {w.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <CodePanel />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-[120px]" />
        <div className="relative mx-auto max-w-3xl px-6 py-28 text-center">
          <h2 className="text-balance text-4xl font-semibold tracking-tight">
            {t.ctaTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-lg text-secondary">
            {t.ctaDesc}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/dashboard" className="btn px-6 py-2.5 text-sm">
              {t.ctaDash} <ArrowRight size={16} />
            </Link>
            <Link href="/docs" className="btn-default px-6 py-2.5 text-sm">
              {t.ctaDocs}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-surface/50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logo />
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-secondary">
                {t.footerTagline}
              </p>
            </div>
            <FooterCol
              title={t.footProduct}
              links={[
                { label: nav.product, href: "#imkoniyatlar" },
                { label: nav.dashboard, href: "/dashboard" },
                { label: nav.login, href: "/login" },
              ]}
            />
            <FooterCol
              title={t.footDocsCol}
              links={[
                { label: nav.docs, href: "/docs" },
                { label: "REST API", href: "/docs/rest" },
                { label: "Auth", href: "/docs/auth" },
              ]}
            />
            <FooterCol
              title={t.footProject}
              links={[
                { label: "GitHub", href: GH, external: true },
                { label: "Storage", href: "/docs/storage" },
                { label: "Realtime", href: "/docs/realtime" },
              ]}
            />
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-sm text-faint sm:flex-row">
            <span>{t.copyright}</span>
            <div className="flex items-center gap-4">
              <a href={GH} target="_blank" className="transition hover:text-fg">
                GitHub
              </a>
              <Link href="/docs" className="transition hover:text-fg">
                {nav.docs}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ────────────────────────── Bo'laklar ────────────────────────── */

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-fg shadow-sm">
        s
      </span>
      storagedb
    </Link>
  );
}

function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-[-15%] h-[480px] w-[860px] -translate-x-1/2 rounded-full bg-brand/15 blur-[130px]" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgb(var(--grid-line) / 0.05) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--grid-line) / 0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 55% at 50% 30%, #000 40%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 55% at 50% 30%, #000 40%, transparent 75%)",
        }}
      />
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-[13px] font-medium uppercase tracking-wider text-brand">
        {eyebrow}
      </span>
      <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-pretty text-secondary">{desc}</p>
    </div>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-faint/50" />;
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <div className="text-[13px] font-medium text-fg">{title}</div>
      <ul className="mt-3 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.label + l.href}>
            {l.external ? (
              <a href={l.href} target="_blank" className="text-secondary transition hover:text-fg">
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="text-secondary transition hover:text-fg">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CodePanel() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#0c0d10] shadow-pop">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-xs text-white/40">app.ts</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-[#e6e6e6]">
        {SNIPPET}
      </pre>
    </div>
  );
}

/** Hero ostidagi mahsulot ko'rinishi — soxta Studio interfeysi. */
function StudioMock({
  label,
}: {
  label: { overview: string; tableEditor: string; sqlEditor: string; auth: string; storage: string; reports: string };
}) {
  const nav = [
    { icon: Database, label: label.overview, active: false },
    { icon: Table2, label: label.tableEditor, active: true },
    { icon: SquareTerminal, label: label.sqlEditor, active: false },
    { icon: Users, label: label.auth, active: false },
    { icon: Archive, label: label.storage, active: false },
    { icon: BarChart3, label: label.reports, active: false },
  ];
  const rows = [
    ["1", "Design system", "true", "2026-06-01"],
    ["2", "REST API", "false", "2026-06-03"],
    ["3", "Auth flow", "true", "2026-06-04"],
    ["4", "Storage bucket", "false", "2026-06-05"],
    ["5", "Realtime channel", "true", "2026-06-06"],
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-panel shadow-pop">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-faint/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-faint/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-faint/40" />
        <div className="mx-auto flex items-center gap-1.5 rounded-md border border-border bg-bg px-3 py-1 font-mono text-[11px] text-faint">
          storage.identify.uz/project
        </div>
      </div>
      <div className="flex h-[340px] text-[12px]">
        <div className="hidden w-48 shrink-0 flex-col border-r border-border bg-surface/60 p-2.5 sm:flex">
          <div className="mb-3 flex items-center gap-2 px-1.5 py-1">
            <span className="grid h-5 w-5 place-items-center rounded bg-brand text-[10px] font-bold text-brand-fg">
              s
            </span>
            <span className="text-[11px] font-medium text-secondary">app · prod</span>
          </div>
          {nav.map((n) => (
            <div
              key={n.label}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                n.active ? "bg-brand/10 text-brand" : "text-secondary"
              }`}
            >
              <n.icon size={14} />
              <span className="truncate">{n.label}</span>
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2 font-medium text-fg">
              <Table2 size={14} className="text-brand" /> todos
            </div>
            <span className="rounded-md bg-brand px-2 py-1 text-[11px] font-medium text-brand-fg">
              + row
            </span>
          </div>
          <div className="grid grid-cols-[40px_1fr_90px_120px] border-b border-border bg-surface/60 px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-faint">
            <span>id</span>
            <span>title</span>
            <span>done</span>
            <span>created</span>
          </div>
          {rows.map((r) => (
            <div
              key={r[0]}
              className="grid grid-cols-[40px_1fr_90px_120px] items-center border-b border-border/60 px-4 py-2 font-mono text-[11px] text-secondary"
            >
              <span className="text-faint">{r[0]}</span>
              <span className="truncate font-sans text-fg">{r[1]}</span>
              <span className={r[2] === "true" ? "text-brand" : "text-faint"}>
                {r[2]}
              </span>
              <span className="text-faint">{r[3]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
