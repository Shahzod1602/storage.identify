"use client";

import { useState } from "react";
import { useProject } from "@/components/project-context";
import { metaQuery } from "@/lib/api";
import { RowsTable } from "@/components/rows-table";

const SAMPLE = `create table public.todos (
  id bigint generated always as identity primary key,
  title text not null,
  done boolean default false,
  owner uuid default auth.uid()
);
alter table public.todos enable row level security;
create policy own on public.todos for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());`;

export default function SqlPage() {
  const { ref, keys } = useProject();
  const [query, setQuery] = useState(SAMPLE);
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!keys) return;
    setBusy(true);
    setError(null);
    try {
      const result = await metaQuery(ref, keys.service_key, query);
      setRows(result);
    } catch (e) {
      setError((e as Error).message);
      setRows(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">SQL Editor</h1>
        <button className="btn" onClick={run} disabled={busy || !keys}>
          {busy ? "Bajarilmoqda..." : "▶ Ishga tushirish"}
        </button>
      </div>
      <textarea
        className="input h-56 font-mono text-xs leading-relaxed"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        spellCheck={false}
      />
      {error && <div className="card text-red-400">{error}</div>}
      {rows !== null && (
        <div className="space-y-2">
          <p className="text-sm text-neutral-500">{rows.length} qator</p>
          <RowsTable rows={rows} />
        </div>
      )}
    </div>
  );
}
