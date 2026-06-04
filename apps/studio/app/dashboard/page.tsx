"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Database, Copy, Check, LogOut, Users } from "lucide-react";
import {
  listProjects,
  createProject,
  getMe,
  logout,
  type ProjectSummary,
  type ProjectKeys,
} from "@/lib/api";
import { useRequireAuth } from "@/components/auth-guard";

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

  if (!ready) return null;

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-sm font-bold text-black">
              s
            </span>
            <span className="font-medium">storagedb</span>
          </Link>
          <span className="text-faint">/</span>
          <span className="text-muted">Tashkilot</span>
          {role === "super_admin" && (
            <span className="badge badge-brand">super admin</span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {role === "super_admin" && (
              <Link href="/dashboard/users" className="btn-ghost">
                <Users size={15} /> Userlar
              </Link>
            )}
            <button className="btn-ghost" onClick={logout} title="Chiqish">
              <LogOut size={15} /> Chiqish
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-medium">Loyihalar</h1>
          <button className="btn" onClick={() => setCreating((v) => !v)}>
            <Plus size={15} /> Yangi loyiha
          </button>
        </div>

        <div className="relative mb-6 max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            className="input pl-9"
            placeholder="Loyiha qidirish..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {creating && (
          <div className="card mb-6 flex items-center gap-3 p-4">
            <input
              autoFocus
              className="input max-w-sm"
              placeholder="Loyiha nomi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onCreate()}
            />
            <button className="btn" onClick={onCreate}>
              Yaratish
            </button>
            <button className="btn-ghost" onClick={() => setCreating(false)}>
              Bekor
            </button>
          </div>
        )}

        {created && <NewKeys keys={created} onClose={() => setCreated(null)} />}

        {error && (
          <div className="card mb-6 border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-faint">Yuklanmoqda...</p>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center rounded-lg border border-dashed border-border py-20 text-center">
            <Database size={28} className="mb-3 text-faint" />
            <p className="text-sm text-muted">Loyiha topilmadi.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Link
                key={p.ref}
                href={`/project/${p.ref}`}
                className="card group p-4 transition hover:border-border-strong hover:bg-hover"
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-md border border-border bg-bg text-brand">
                    <Database size={16} />
                  </span>
                  <span className="badge">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Active
                  </span>
                </div>
                <div className="mt-3 font-medium group-hover:text-brand">
                  {p.name}
                </div>
                <div className="mt-1 font-mono text-xs text-faint">{p.ref}</div>
                <div className="mt-3 border-t border-border pt-2 text-xs text-faint">
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

function NewKeys({ keys, onClose }: { keys: ProjectKeys; onClose: () => void }) {
  return (
    <div className="card mb-6 border-brand/30 bg-brand/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-brand">
          "{keys.name}" yaratildi — kalitlarni saqlang
        </p>
        <button className="btn-ghost" onClick={onClose}>
          ✕
        </button>
      </div>
      <CopyRow label="ref" value={keys.ref} />
      <CopyRow label="anon key" value={keys.anon_key} />
      <CopyRow label="service key" value={keys.service_key} />
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3 border-b border-border/50 py-2 last:border-0">
      <span className="w-24 shrink-0 text-xs text-faint">{label}</span>
      <code className="flex-1 truncate font-mono text-xs text-muted">
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
