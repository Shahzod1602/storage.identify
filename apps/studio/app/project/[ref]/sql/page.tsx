"use client";

import { useState } from "react";
import { Play, Plus, FileCode, Loader2 } from "lucide-react";
import { useProject } from "@/components/project-context";
import { metaQuery } from "@/lib/api";
import { DataGrid } from "@/components/data-grid";

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
  name: string;
  sql: string;
}

export default function SqlPage() {
  const { ref, keys } = useProject();
  const [query, setQuery] = useState(SAMPLE);
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<Snippet[]>([]);

  async function run() {
    if (!keys || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await metaQuery(ref, keys.service_key, query);
      setRows(result);
      setRecent((r) =>
        [{ name: query.split("\n")[0].slice(0, 40), sql: query }, ...r].slice(0, 8),
      );
    } catch (e) {
      setError((e as Error).message);
      setRows(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar: queries */}
      <div className="flex w-60 shrink-0 flex-col border-r border-border bg-bg">
        <div className="p-3">
          <button
            className="btn-default w-full justify-start"
            onClick={() => {
              setQuery("");
              setRows(null);
              setError(null);
            }}
          >
            <Plus size={14} /> Yangi so'rov
          </button>
        </div>
        <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-faint">
          So'nggi
        </div>
        <div className="flex-1 overflow-auto px-2">
          {recent.length === 0 && (
            <p className="px-2 py-2 text-xs text-faint">Hali so'rov yo'q</p>
          )}
          {recent.map((s, i) => (
            <button
              key={i}
              onClick={() => setQuery(s.sql)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-muted transition hover:bg-hover hover:text-fg"
            >
              <FileCode size={13} className="shrink-0 text-faint" />
              <span className="truncate">{s.name || "so'rov"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main: editor + results */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="text-[13px] text-muted">SQL Editor</span>
          <button className="btn" onClick={run} disabled={busy || !keys}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={13} />}
            Run <span className="ml-1 hidden text-[11px] opacity-70 sm:inline">⌘↵</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <textarea
            className="h-[45%] w-full resize-none border-b border-border bg-surface px-4 py-3 font-mono text-[13px] leading-relaxed text-fg outline-none placeholder:text-faint"
            value={query}
            spellCheck={false}
            placeholder="SQL yozing..."
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void run();
              }
            }}
          />
          <div className="min-h-0 flex-1 overflow-auto bg-surface p-4">
            {error ? (
              <div className="card border-red-500/30 bg-red-500/5 p-3 font-mono text-xs text-red-400">
                {error}
              </div>
            ) : rows === null ? (
              <p className="text-sm text-faint">
                Natija shu yerda chiqadi. <span className="kbd">⌘ ↵</span> bilan
                ishga tushiring.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-faint">
                  {rows.length} qator{rows.length === 0 && " · muvaffaqiyatli"}
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
