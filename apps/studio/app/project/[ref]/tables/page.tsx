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
  nullable: boolean;
  def: string | null;
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
        `select column_name, data_type, is_identity, is_nullable, column_default
         from information_schema.columns
         where table_schema='public' and table_name='${table}'
         order by ordinal_position`,
      );
      setColumns(
        cols.map((c) => ({
          name: String(c.column_name),
          type: shortType(String(c.data_type)),
          identity: c.is_identity === "YES",
          nullable: c.is_nullable === "YES",
          def: c.column_default != null ? String(c.column_default) : null,
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

  // Insert formasida ko'rsatiladigan ustunlar (identity/auto ustunlar chiqmaydi).
  const editableCols = columns.filter((c) => !c.identity);
  // Majburiy: NOT NULL va default yo'q. Bo'lsa — to'ldirilishi shart.
  const isRequired = (c: Column) => !c.nullable && c.def === null;
  const missingRequired = editableCols.some(
    (c) => isRequired(c) && !(form[c.name] ?? "").trim(),
  );

  return (
    <div className="flex h-full">
      {/* Table list */}
      <div className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
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
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition ${
                active === t
                  ? "bg-brand/10 font-medium text-brand"
                  : "text-secondary hover:bg-hover hover:text-fg"
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
              <div className="m-4 alert-danger text-xs">{error}</div>
            )}

            <div className="flex min-h-0 flex-1">
              <div className="min-w-0 flex-1 overflow-auto p-4">
                <DataGrid rows={rows} types={typeMap} emptyHint="Qator yo'q" />
              </div>

              {showInsert && (
                <div className="w-80 shrink-0 overflow-auto border-l border-border bg-surface p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">Yangi qator</span>
                    <button
                      className="text-faint hover:text-fg"
                      onClick={() => setShowInsert(false)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <p className="mb-3 text-xs text-faint">
                    Bo'sh qoldirilgan maydon uchun ustunning default qiymati yoki
                    NULL ishlatiladi.
                  </p>
                  <div className="space-y-3">
                    {editableCols.map((c) => (
                      <div key={c.name}>
                        <label className="mb-1 flex items-center gap-1.5 text-xs text-muted">
                          <span>{c.name}</span>
                          <span className="col-type">{c.type}</span>
                          {isRequired(c) ? (
                            <span className="text-red-400" title="Majburiy">
                              *
                            </span>
                          ) : (
                            <span className="text-[10px] text-faint">
                              {c.def !== null
                                ? `· default: ${shortDefault(c.def)}`
                                : "· null"}
                            </span>
                          )}
                        </label>
                        <CellInput
                          column={c}
                          value={form[c.name] ?? ""}
                          onChange={(v) =>
                            setForm((f) => ({ ...f, [c.name]: v }))
                          }
                        />
                      </div>
                    ))}
                    <button
                      className="btn w-full"
                      onClick={insertRow}
                      disabled={missingRequired}
                    >
                      Saqlash
                    </button>
                    {missingRequired && (
                      <p className="text-center text-xs text-faint">
                        <span className="text-red-400">*</span> majburiy maydonlarni
                        to'ldiring
                      </p>
                    )}
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

const NUMERIC_TYPES = ["int2", "int4", "int8", "float4", "float8", "numeric"];

// Ustun tipiga mos input: bool -> select, son -> number, qolgani -> text.
function CellInput({
  column,
  value,
  onChange,
}: {
  column: Column;
  value: string;
  onChange: (v: string) => void;
}) {
  const required = !column.nullable && column.def === null;
  const placeholder = required ? "majburiy" : column.def !== null ? "default" : "NULL";

  if (column.type === "bool") {
    return (
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  return (
    <input
      className="input"
      type={NUMERIC_TYPES.includes(column.type) ? "number" : "text"}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// `nextval('..'::regclass)` / `'x'::text` kabi defaultni qisqartiradi.
function shortDefault(def: string): string {
  const clean = def.replace(/::[a-z0-9_ ."[\]]+/gi, "").replace(/^'|'$/g, "").trim();
  return clean.length > 16 ? clean.slice(0, 16) + "…" : clean;
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
