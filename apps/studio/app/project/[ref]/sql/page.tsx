"use client";

import { useEffect, useState } from "react";
import {
  Play,
  Plus,
  FileCode,
  Loader2,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import { useProject } from "@/components/project-context";
import { metaQuery } from "@/lib/api";
import { DataGrid } from "@/components/data-grid";
import { confirmDialog } from "@/components/feedback";
import { useT } from "@/lib/i18n/client";

const SAMPLE = `create table public.todos (
  id bigint generated always as identity primary key,
  title text not null,
  done boolean default false,
  owner uuid default auth.uid()
);
alter table public.todos enable row level security;
create policy "own todos" on public.todos for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());`;

interface Snippet {
  id: string;
  name: string;
  sql: string;
}

// localStorage'da loyiha bo'yicha saqlanadigan so'rovlar.
const storeKey = (ref: string) => `sdb_sql_${ref}`;

function loadSnippets(ref: string): Snippet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storeKey(ref));
    if (raw) {
      const parsed = JSON.parse(raw) as Snippet[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* buzilgan ma'lumot — yangidan boshlaymiz */
  }
  return [{ id: newId(), name: "Boshlang'ich", sql: SAMPLE }];
}

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export default function SqlPage() {
  const { ref, keys } = useProject();
  const t = useT();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  // Mount: saqlangan so'rovlarni tiklash (sahifa almashtirilsa ham kod yo'qolmaydi).
  useEffect(() => {
    const initial = loadSnippets(ref);
    setSnippets(initial);
    setActiveId(initial[0].id);
    setLoaded(true);
  }, [ref]);

  // Har o'zgarishda localStorage'ga yozamiz.
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storeKey(ref), JSON.stringify(snippets));
    } catch {
      /* kvota to'lgan bo'lishi mumkin — e'tiborsiz qoldiramiz */
    }
  }, [snippets, ref, loaded]);

  const active = snippets.find((s) => s.id === activeId) ?? null;

  function setActiveSql(sql: string) {
    setSnippets((prev) =>
      prev.map((s) => (s.id === activeId ? { ...s, sql } : s)),
    );
  }

  function addSnippet() {
    const n = snippets.length + 1;
    const snip: Snippet = { id: newId(), name: `So'rov ${n}`, sql: "" };
    setSnippets((prev) => [snip, ...prev]);
    setActiveId(snip.id);
    setRows(null);
    setError(null);
  }

  async function removeSnippet(id: string) {
    const ok = await confirmDialog({
      title: t.sql.deleteTitle,
      message: t.sql.deleteMsg,
      danger: true,
      confirmLabel: t.common.delete,
    });
    if (!ok) return;
    setSnippets((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) {
        const fresh: Snippet = { id: newId(), name: "Boshlang'ich", sql: "" };
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  }

  function startRename(s: Snippet) {
    setRenamingId(s.id);
    setRenameText(s.name);
  }

  function commitRename() {
    const id = renamingId;
    if (!id) return;
    const name = renameText.trim() || "so'rov";
    setSnippets((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
    setRenamingId(null);
  }

  async function run() {
    if (!keys || busy || !active) return;
    setBusy(true);
    setError(null);
    try {
      const result = await metaQuery(ref, keys.service_key, active.sql);
      setRows(result);
    } catch (e) {
      setError((e as Error).message);
      setRows(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Sidebar: saqlangan so'rovlar */}
      <div className="flex w-full shrink-0 flex-col border-b border-border bg-surface md:w-60 md:border-b-0 md:border-r">
        <div className="p-3">
          <button
            className="btn-default w-full justify-start"
            onClick={addSnippet}
          >
            <Plus size={14} /> {t.sql.newQuery}
          </button>
        </div>
        <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-faint">
          {t.sql.queries}
        </div>
        <div className="max-h-40 overflow-auto px-2 pb-2 md:max-h-none md:flex-1">
          {snippets.length === 0 && (
            <p className="px-2 py-2 text-xs text-faint">{t.sql.noQuery}</p>
          )}
          {snippets.map((s) => {
            const isActive = s.id === activeId;
            return (
              <div
                key={s.id}
                className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-[13px] transition ${
                  isActive ? "bg-hover text-fg" : "text-muted hover:bg-hover"
                }`}
              >
                <FileCode size={13} className="shrink-0 text-faint" />
                {renamingId === s.id ? (
                  <input
                    autoFocus
                    className="min-w-0 flex-1 rounded border border-border-strong bg-bg px-1 py-0.5 text-[13px] text-fg outline-none focus:border-brand"
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                  />
                ) : (
                  <>
                    <button
                      onClick={() => setActiveId(s.id)}
                      onDoubleClick={() => startRename(s)}
                      className="min-w-0 flex-1 truncate text-left hover:text-fg"
                      title={s.name}
                    >
                      {s.name}
                    </button>
                    <button
                      onClick={() => startRename(s)}
                      title="Nomini o'zgartirish"
                      className="shrink-0 rounded p-0.5 text-faint opacity-0 transition hover:bg-bg hover:text-fg group-hover:opacity-100"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => removeSnippet(s.id)}
                      title="O'chirish"
                      className="shrink-0 rounded p-0.5 text-faint opacity-0 transition hover:bg-bg hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main: editor + results */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="text-[13px] text-muted">
            {t.sql.editorTitle}
            {active && <span className="ml-2 text-faint">· {active.name}</span>}
          </span>
          <button className="btn" onClick={run} disabled={busy || !keys || !active}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={13} />}
            {t.sql.run} <span className="ml-1 hidden text-[11px] opacity-70 sm:inline">⌘↵</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <textarea
            className="h-[45%] w-full resize-none border-b border-border bg-surface px-4 py-3 font-mono text-[13px] leading-relaxed text-fg outline-none placeholder:text-faint"
            value={active?.sql ?? ""}
            spellCheck={false}
            placeholder={t.sql.queryPlaceholder}
            disabled={!active}
            onChange={(e) => setActiveSql(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void run();
              }
            }}
          />
          <div className="min-h-0 flex-1 overflow-auto bg-surface p-4">
            {error ? (
              <div className="alert-danger whitespace-pre-wrap font-mono text-xs">
                {error}
              </div>
            ) : rows === null ? (
              <p className="flex items-center gap-1.5 text-sm text-faint">
                {t.sql.resultHint} <span className="kbd">⌘ ↵</span>
              </p>
            ) : (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs text-faint">
                  {rows.length === 0 && <Check size={12} className="text-brand" />}
                  {t.sql.rows(rows.length)}
                  {rows.length === 0 && ` · ${t.sql.success}`}
                </p>
                {rows.length > 0 && <DataGrid rows={rows} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
