"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Database,
  Copy,
  Check,
  LogOut,
  Users,
  ArrowRight,
  X,
} from "lucide-react";
import {
  listProjects,
  createProject,
  getMe,
  logout,
  type ProjectSummary,
  type ProjectKeys,
} from "@/lib/api";
import { useRequireAuth } from "@/components/auth-guard";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardPage() {
  const ready = useRequireAuth();
  const [role, setRole] = useState<"super_admin" | "user" | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ProjectKeys | null>(null);

  async function reload() {
    try {
      setProjects(await listProjects());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ready) {
      void reload();
      getMe().then((m) => setRole(m.role)).catch(() => {});
    }
  }, [ready]);

  async function onCreate() {
    if (!name.trim()) return;
    try {
      setCreated(await createProject(name.trim()));
      setName("");
      setCreating(false);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Bekor qilinganda yozilgan nom o'chiriladi — keyingi safar bo'sh ochiladi.
  function cancelCreate() {
    setName("");
    setError(null);
    setCreating(false);
  }

  if (!ready) return null;

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-fg shadow-sm">
              s
            </span>
            <span>storagedb</span>
          </Link>
          <ChevronSep />
          <span className="text-sm text-secondary">Tashkilot</span>
          {role === "super_admin" && (
            <span className="badge badge-brand">super admin</span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {role === "super_admin" && (
              <Link href="/dashboard/users" className="btn-ghost">
                <Users size={15} /> Userlar
              </Link>
            )}
            <ThemeToggle />
            <button className="btn-ghost" onClick={logout} title="Chiqish">
              <LogOut size={15} /> Chiqish
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Loyihalar</h1>
            <p className="mt-1 text-sm text-secondary">
              {loading
                ? "Yuklanmoqda…"
                : `${projects.length} ta loyiha · bitta serverda`}
            </p>
          </div>
          <button
            className="btn"
            onClick={() => (creating ? cancelCreate() : setCreating(true))}
          >
            <Plus size={15} /> Yangi loyiha
          </button>
        </div>

        <div className="relative mb-6 max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            className="input pl-9"
            placeholder="Loyiha qidirish…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {creating && (
          <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
            <input
              autoFocus
              className="input max-w-sm flex-1"
              placeholder="Loyiha nomi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onCreate()}
            />
            <button className="btn" onClick={onCreate}>
              Yaratish
            </button>
            <button className="btn-ghost" onClick={cancelCreate}>
              Bekor
            </button>
          </div>
        )}

        {created && <NewKeys keys={created} onClose={() => setCreated(null)} />}

        {error && <div className="alert-danger mb-6">{error}</div>}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card p-5">
                <div className="skeleton h-10 w-10 rounded-lg" />
                <div className="skeleton mt-4 h-4 w-32" />
                <div className="skeleton mt-2 h-3 w-24" />
                <div className="skeleton mt-5 h-3 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center rounded-xl border border-dashed border-border-strong py-20 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-surface text-faint">
              <Database size={22} />
            </div>
            <p className="mt-4 font-medium">
              {query ? "Loyiha topilmadi" : "Hali loyiha yo'q"}
            </p>
            <p className="mt-1 text-sm text-secondary">
              {query
                ? "Boshqa nom bilan qidirib ko'ring."
                : "Birinchi loyihangizni yarating va API'ni ulang."}
            </p>
            {!query && (
              <button
                className="btn mt-5"
                onClick={() => setCreating(true)}
              >
                <Plus size={15} /> Yangi loyiha
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Link
                key={p.ref}
                href={`/project/${p.ref}`}
                className="card group p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40"
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-brand/10 text-brand">
                    <Database size={18} />
                  </span>
                  <span className="badge badge-brand">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Faol
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-1.5 font-medium tracking-tight transition group-hover:text-brand">
                  {p.name}
                  <ArrowRight
                    size={14}
                    className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </div>
                <div className="mt-1 font-mono text-xs text-faint">{p.ref}</div>
                <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-faint">
                  <Database size={12} />
                  Postgres · {p.db_name}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronSep() {
  return <span className="text-faint">/</span>;
}

function NewKeys({ keys, onClose }: { keys: ProjectKeys; onClose: () => void }) {
  return (
    <div className="card mb-6 animate-fade-in border-brand/30 bg-brand/[0.05] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand/15 text-brand">
            <Check size={15} />
          </span>
          <p className="text-sm font-medium">
            "{keys.name}" yaratildi — kalitlarni saqlang
          </p>
        </div>
        <button className="btn-ghost !px-1.5" onClick={onClose}>
          <X size={15} />
        </button>
      </div>
      <div className="rounded-lg border border-border bg-bg px-4">
        <CopyRow label="ref" value={keys.ref} />
        <CopyRow label="anon key" value={keys.anon_key} />
        <CopyRow label="service key" value={keys.service_key} />
      </div>
      <p className="mt-3 text-xs text-secondary">
        service key maxfiy — uni faqat backend'da ishlating va hech kimga bermang.
      </p>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-0">
      <span className="w-24 shrink-0 text-xs font-medium text-faint">{label}</span>
      <code className="flex-1 truncate font-mono text-xs text-secondary">
        {value}
      </code>
      <button
        className="btn-ghost btn-xs"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? <Check size={13} className="text-brand" /> : <Copy size={13} />}
      </button>
    </div>
  );
}
