"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/components/project-context";
import { metaQuery } from "@/lib/api";
import { RowsTable } from "@/components/rows-table";

export default function TablesPage() {
  const { ref, keys } = useProject();
  const [tables, setTables] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!keys) return;
    metaQuery(
      ref,
      keys.service_key,
      `select table_name from information_schema.tables
       where table_schema='public' and table_type='BASE TABLE'
       order by table_name`,
    )
      .then((r) => setTables(r.map((x) => String(x.table_name))))
      .catch((e) => setError(e.message));
  }, [ref, keys]);

  async function open(table: string) {
    if (!keys) return;
    setActive(table);
    try {
      setRows(
        await metaQuery(
          ref,
          keys.service_key,
          `select * from "public"."${table}" limit 100`,
        ),
      );
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Jadvallar</h1>
      {error && <div className="card text-red-400">{error}</div>}
      <div className="flex flex-wrap gap-2">
        {tables.length === 0 && (
          <p className="text-sm text-neutral-500">
            public schemada jadval yo'q — SQL Editor'da yarating.
          </p>
        )}
        {tables.map((t) => (
          <button
            key={t}
            onClick={() => open(t)}
            className={`rounded-md border px-3 py-1.5 text-sm transition ${
              active === t
                ? "border-brand bg-brand/10 text-brand"
                : "border-edge hover:bg-panel"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {active && (
        <div className="space-y-2">
          <p className="text-sm text-neutral-500">
            <code className="kbd">{active}</code> — {rows.length} qator (max 100)
          </p>
          <RowsTable rows={rows} />
        </div>
      )}
    </div>
  );
}
