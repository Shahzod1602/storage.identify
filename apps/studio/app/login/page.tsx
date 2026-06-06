"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  Loader2,
  ArrowRight,
  Database,
  KeyRound,
  HardDrive,
  Radio,
} from "lucide-react";
import { login } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email || !password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Chap: forma ── */}
      <div className="relative flex flex-1 flex-col px-6 py-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-fg shadow-sm">
              s
            </span>
            storagedb
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[360px] animate-fade-in">
            <h1 className="text-2xl font-semibold tracking-tight">
              Hisobingizga kiring
            </h1>
            <p className="mt-2 text-sm text-secondary">
              Dashboard'ni boshqarish uchun email va parolingizni kiriting.
            </p>

            <div className="mt-8 space-y-4">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                  />
                  <input
                    className="input pl-9"
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="admin@storagedb.local"
                  />
                </div>
              </div>

              <div>
                <label className="label">Parol</label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
                  />
                  <input
                    className="input pl-9"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && <div className="alert-danger">{error}</div>}

              <button
                className="btn w-full justify-center py-2.5"
                onClick={submit}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <>
                    Kirish <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-secondary">
              Super admin sifatida kirish:{" "}
              <code className="kbd">SUPER_ADMIN_EMAIL</code> va parol ={" "}
              <code className="kbd">PLATFORM_ADMIN_TOKEN</code>.
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-faint sm:text-left">
          © 2026 storagedb · self-hosted BaaS
        </div>
      </div>

      {/* ── O'ng: brend paneli ── */}
      <div className="relative hidden w-[44%] max-w-2xl overflow-hidden border-l border-border bg-surface lg:block">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-[-10%] top-[-10%] h-[460px] w-[460px] rounded-full bg-brand/20 blur-[120px]" />
          <div className="absolute bottom-[-15%] left-[-10%] h-[380px] w-[380px] rounded-full bg-brand/10 blur-[120px]" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgb(var(--grid-line) / 0.04) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--grid-line) / 0.04) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
        </div>

        <div className="relative flex h-full flex-col justify-center px-14">
          <blockquote className="max-w-md text-balance text-2xl font-medium leading-snug tracking-tight">
            “Backend uchun kerak bo'lgan hamma narsa — o'z serveringizda, to'liq
            nazoratingizda.”
          </blockquote>
          <p className="mt-4 text-sm text-secondary">
            Postgres · Auth · Storage · Realtime
          </p>

          <div className="mt-12 grid max-w-md grid-cols-2 gap-3">
            {[
              { icon: Database, label: "Postgres + REST" },
              { icon: KeyRound, label: "Authentication" },
              { icon: HardDrive, label: "Storage" },
              { icon: Radio, label: "Realtime" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-panel/60 px-3.5 py-3 backdrop-blur"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand/10 text-brand">
                  <f.icon size={15} />
                </span>
                <span className="text-[13px] font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
