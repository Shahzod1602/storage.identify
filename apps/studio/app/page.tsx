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
} from "lucide-react";

const FEATURES = [
  {
    icon: Database,
    title: "Postgres + REST API",
    desc: "Har loyiha alohida Postgres. Schemadan avtomatik REST (CRUD, filtrlar, joins, RPC) — RLS bilan himoyalangan.",
  },
  {
    icon: KeyRound,
    title: "Authentication",
    desc: "Email/parol, JWT, refresh rotatsiya, email tasdiqlash, parol tiklash, admin boshqaruvi.",
  },
  {
    icon: HardDrive,
    title: "Storage",
    desc: "Public/private bucketlar, signed URL'lar, fayl yuklash/yuklab olish — RLS bilan.",
  },
  {
    icon: Radio,
    title: "Realtime",
    desc: "Postgres o'zgarishlari, broadcast kanallar va presence — WebSocket orqali, jonli.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    desc: "Table editor, SQL editor, auth/storage boshqaruvi, jonli hisobotlar — Supabase Studio uslubida.",
  },
  {
    icon: Code2,
    title: "Client SDK",
    desc: "supabase-js kabi: .from().select(), .auth, .storage, .channel(), .rpc(). TypeScript tayyor.",
  },
];

const WHY = [
  {
    icon: Server,
    title: "O'z serveringizda",
    desc: "Ma'lumotlaringiz sizniki. Faqat VPS puli — obuna yo'q. Ko'p loyiha bitta serverda.",
  },
  {
    icon: ShieldCheck,
    title: "Xavfsiz",
    desc: "Shifrlangan kalitlar, RLS izolyatsiya, HTTPS, per-key rate-limit, avtomatik backup.",
  },
  {
    icon: Zap,
    title: "Supabase-mos",
    desc: "Tanish API va SDK. Mavjud bilimlaringiz ishlaydi, migratsiya oson.",
  },
];

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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="sticky top-0 z-20 border-b border-border/60 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-sm font-bold text-black">
              s
            </span>
            storagedb
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/Shahzod1602/storage.identify"
              target="_blank"
              className="btn-ghost"
            >
              <Github size={15} /> GitHub
            </a>
            <Link href="/dashboard" className="btn">
              Dashboard <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        {/* fon: yashil nur + grid */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-10%] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-brand/15 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 py-28 text-center">
          <span className="badge badge-brand mb-6">
            Self-hosted Backend-as-a-Service
          </span>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            O'zingizning <span className="text-brand">Supabase</span>'ingiz.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
            Postgres, Auth, Storage, Realtime va Dashboard — hammasi bitta
            platformada, o'z serveringizda. Obuna yo'q, faqat VPS.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Link href="/dashboard" className="btn px-5 py-2.5 text-sm">
              Boshlash <ArrowRight size={16} />
            </Link>
            <a
              href="https://github.com/Shahzod1602/storage.identify"
              target="_blank"
              className="btn-default px-5 py-2.5 text-sm"
            >
              <Github size={16} /> Kodni ko'rish
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-medium">Hammasi tayyor</h2>
          <p className="mt-2 text-muted">
            Backend uchun kerak bo'lgan barcha narsa — qutidan tashqari.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="card group p-5 transition hover:border-brand/40 hover:bg-hover"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-bg text-brand transition group-hover:scale-110">
                <f.icon size={18} />
              </span>
              <h3 className="mt-4 font-medium">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Code + Why */}
      <section className="border-y border-border bg-bg/40">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-medium">Tanish SDK bilan</h2>
            <p className="mt-2 text-muted">
              <code className="kbd">supabase-js</code> bilishingiz kifoya — bir
              xil tajriba.
            </p>
            <div className="mt-6 space-y-5">
              {WHY.map((w) => (
                <div key={w.title} className="flex gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand/10 text-brand">
                    <w.icon size={16} />
                  </span>
                  <div>
                    <div className="font-medium">{w.title}</div>
                    <div className="text-sm text-muted">{w.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-[#141414]">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-brand/70" />
              <span className="ml-2 text-xs text-faint">app.ts</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-fg/90">
              {SNIPPET}
            </pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-3xl font-medium">Bugun boshlang</h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Loyiha yarating, jadval tuzing, API'ni ishlating — bir necha
          daqiqada.
        </p>
        <Link href="/dashboard" className="btn mt-8 px-6 py-2.5 text-sm">
          Dashboard'ga kirish <ArrowRight size={16} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-faint sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded bg-brand text-[10px] font-bold text-black">
              s
            </span>
            storagedb — self-hosted BaaS
          </div>
          <a
            href="https://github.com/Shahzod1602/storage.identify"
            target="_blank"
            className="transition hover:text-fg"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
