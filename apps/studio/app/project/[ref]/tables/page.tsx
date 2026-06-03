"use client";

import { useEffect, useState } from "react";
import { Table2, Plus, RefreshCw, X, Database } from "lucide-react";
import { useProject } from "@/components/project-context";
import { metaQuery, GATEWAY } from "@/lib/api";
import { DataGrid } from "@/components/data-grid";

interface Column {
  name: string;
  type: string;
  identity: boolean;
}

export default function TablesPage() {
  const { ref, keys } = useProject();
  const [tables, setTables] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showInsert, setShowInsert] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  async function loadTables() {
    if (!keys) return;
    try {
      const r = await metaQuery(
        ref,
        keys.service_key,
        `select table_name from information_schema.tables
         where table_schema='public' and table_type='BASE TABLE' order by table_name`,
      );
      const names = r.map((x) => String(x.table_name));
      setTables(names);
      // Birinchi jadvalni avtomatik ochamiz (Supabase uslubi).
      if (!active && names.length > 0) void open(names[0]);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void loadTables();
  }, [ref, keys]);

  async function open(table: string) {
    if (!keys) return;
    setActive(table);
    setShowInsert(false);
    try {
      const cols = await metaQuery(
        ref,
        keys.service_key,
        `select column_name, data_type, is_identity
         from information_schema.columns
         where table_schema='public' and table_name='${table}'
         order by ordinal_position`,
      );
      setColumns(
        cols.map((c) => ({
          name: String(c.column_name),
          type: shortType(String(c.data_type)),
          identity: c.is_identity === "YES",
        })),
      );
      setRows(
        await metaQuery(
          ref,
          keys.service_key,
          `select * from "public"."${table}" order by 1 limit 100`,
        ),
      );
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function insertRow() {
    if (!keys || !active) return;
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v !== "") body[k] = v;
    }
    const res = await fetch(`${GATEWAY}/v1/${ref}/rest/v1/${active}`, {
      method: "POST",
      headers: { apikey: keys.service_key, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Insert xatosi");
      return;
    }
    setForm({});
    setShowInsert(false);
    await open(active);
  }

  const typeMap = Object.fromEntries(columns.map((c) => [c.name, c.type]));

  return (
    <div className="flex h-full">
      {/* Table list */}
      <div className="flex w-60 shrink-0 flex-col border-r border-border bg-bg">
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
            schema: public
          </span>
          <button
            className="text-faint hover:text-fg"
            onClick={loadTables}
            title="Yangilash"
          >
            <RefreshCw size={13} />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-2 pb-2">
          {tables.length === 0 && (
            <p className="px-2 py-2 text-xs text-faint">
              Jadval yo'q — SQL Editor'da yarating
            </p>
          )}
          {tables.map((t) => (
            <button
              key={t}
              onClick={() => open(t)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition ${
                active === t
                  ? "bg-hover text-brand"
                  : "text-muted hover:bg-hover hover:text-fg"
              }`}
            >
              <Table2 size={14} className="shrink-0" />
              <span className="truncate">{t}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!active ? (
          <div className="grid flex-1 place-items-center text-center">
            <div>
              <Database size={28} className="mx-auto mb-3 text-faint" />
              <p className="text-sm text-muted">
                Chapdan jadval tanlang yoki SQL Editor'da yarating
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2 text-[13px]">
                <Table2 size={15} className="text-brand" />
                <span className="font-medium">{active}</span>
                <span className="text-faint">· {rows.length} qator</span>
              </div>
              <button
                className="btn"
                onClick={() => setShowInsert((v) => !v)}
              >
                <Plus size={14} /> Insert
              </button>
            </div>

            {error && (
              <div className="m-4 card border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <div className="flex min-h-0 flex-1">
              <div className="min-w-0 flex-1 overflow-auto p-4">
                <DataGrid rows={rows} types={typeMap} emptyHint="Qator yo'q" />
              </div>

              {showInsert && (
                <div className="w-80 shrink-0 overflow-auto border-l border-border bg-bg p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">Yangi qator</span>
                    <button
                      className="text-faint hover:text-fg"
                      onClick={() => setShowInsert(false)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {columns
                      .filter((c) => !c.identity)
                      .map((c) => (
                        <div key={c.name}>
                          <label className="mb-1 block text-xs text-muted">
                            {c.name}
                            <span className="col-type">{c.type}</span>
                          </label>
                          <input
                            className="input"
                            placeholder="NULL / default"
                            value={form[c.name] ?? ""}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, [c.name]: e.target.value }))
                            }
                          />
                        </div>
                      ))}
                    <button className="btn w-full" onClick={insertRow}>
                      Saqlash
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function shortType(t: string): string {
  const map: Record<string, string> = {
    "bigint": "int8",
    "integer": "int4",
    "smallint": "int2",
    "boolean": "bool",
    "character varying": "varchar",
    "timestamp with time zone": "timestamptz",
    "timestamp without time zone": "timestamp",
    "double precision": "float8",
    "numeric": "numeric",
    "text": "text",
    "uuid": "uuid",
    "jsonb": "jsonb",
    "json": "json",
  };
  return map[t] ?? t;
}
