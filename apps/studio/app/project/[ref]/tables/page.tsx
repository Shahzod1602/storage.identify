"use client";

import { useEffect, useState } from "react";
import {
  Table2,
  Plus,
  RefreshCw,
  X,
  Database,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { useProject } from "@/components/project-context";
import { metaQuery, GATEWAY } from "@/lib/api";
import { DataGrid } from "@/components/data-grid";
import { toast, confirmDialog, promptDialog } from "@/components/feedback";
import { useT } from "@/lib/i18n/client";

interface Column {
  name: string;
  type: string;
  identity: boolean;
  nullable: boolean;
  def: string | null;
}

const PAGE_SIZE = 50;

function qIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export default function TablesPage() {
  const { ref, keys } = useProject();
  const t = useT();
  const [tables, setTables] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [pkCols, setPkCols] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
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
      if (!active && names.length > 0) void open(names[0]);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void loadTables();
  }, [ref, keys?.service_key]);

  async function open(table: string) {
    if (!keys) return;
    setActive(table);
    setShowInsert(false);
    setPage(0);
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
      // Primary key (o'chirish/sahifalash uchun)
      const pk = await metaQuery(
        ref,
        keys.service_key,
        `select kcu.column_name as col
         from information_schema.table_constraints tc
         join information_schema.key_column_usage kcu
           on tc.constraint_name = kcu.constraint_name
          and tc.constraint_schema = kcu.constraint_schema
         where tc.constraint_type='PRIMARY KEY'
           and tc.table_schema='public' and tc.table_name='${table}'
         order by kcu.ordinal_position`,
      );
      const pkNames = pk.map((x) => String(x.col));
      setPkCols(pkNames);
      await loadRows(table, 0, pkNames);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function loadRows(table: string, pageN: number, pk: string[]) {
    if (!keys) return;
    const orderBy = pk.length ? pk.map(qIdent).join(", ") : "1";
    const [data, cnt] = await Promise.all([
      metaQuery(
        ref,
        keys.service_key,
        `select * from "public".${qIdent(table)} order by ${orderBy}
         limit ${PAGE_SIZE} offset ${pageN * PAGE_SIZE}`,
      ),
      metaQuery(
        ref,
        keys.service_key,
        `select count(*)::int as count from "public".${qIdent(table)}`,
      ),
    ]);
    setRows(data);
    setTotal(Number(cnt[0]?.count ?? 0));
    setPage(pageN);
  }

  async function goPage(n: number) {
    if (!active) return;
    try {
      await loadRows(active, n, pkCols);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function refresh() {
    if (active) await goPage(page);
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
      // 409 = unique/foreign key konflikti — tushunarli xabar ko'rsatamiz.
      const serverMsg = (await res.json().catch(() => ({}))).error;
      const msg =
        res.status === 409
          ? t.tables.conflictMsg
          : serverMsg ?? t.tables.insertFail;
      setError(msg);
      toast.error(msg);
      return;
    }
    setForm({});
    setShowInsert(false);
    setError(null);
    toast.success(t.tables.added);
    await goPage(0);
  }

  async function deleteRow(row: Record<string, unknown>) {
    if (!keys || !active) return;
    if (pkCols.length === 0) {
      toast.error(t.tables.noPk);
      return;
    }
    const ok = await confirmDialog({
      title: t.tables.deleteTitle,
      message: t.tables.deleteMsg,
      danger: true,
      confirmLabel: t.common.delete,
    });
    if (!ok) return;
    const params = pkCols
      .map((c) => `${encodeURIComponent(c)}=eq.${encodeURIComponent(String(row[c]))}`)
      .join("&");
    const res = await fetch(
      `${GATEWAY}/v1/${ref}/rest/v1/${active}?${params}`,
      { method: "DELETE", headers: { apikey: keys.service_key } },
    );
    if (!res.ok) {
      toast.error(
        (await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`,
      );
      return;
    }
    toast.success(t.tables.deleted);
    // Oxirgi sahifadagi yagona qator o'chsa — oldingi sahifaga qaytamiz.
    const lastOnPage = rows.length === 1 && page > 0;
    await goPage(lastOnPage ? page - 1 : page);
  }

  async function renameTable(name: string) {
    if (!keys) return;
    const res = await promptDialog({
      title: t.tables.renameTable,
      label: t.tables.renameTableLabel,
      defaultValue: name,
      confirmLabel: t.common.save,
    });
    if (!res || res.value === name) return;
    try {
      await metaQuery(
        ref,
        keys.service_key,
        `alter table "public".${qIdent(name)} rename to ${qIdent(res.value)}`,
      );
      toast.success(t.tables.renamedTable);
      await loadTables();
      if (active === name) await open(res.value);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function dropTable(name: string) {
    if (!keys) return;
    const ok = await confirmDialog({
      title: t.tables.deleteTable,
      message: t.tables.dropTableMsg(name),
      danger: true,
      confirmLabel: t.common.delete,
    });
    if (!ok) return;
    try {
      await metaQuery(
        ref,
        keys.service_key,
        `drop table "public".${qIdent(name)} cascade`,
      );
      toast.success(t.tables.droppedTable);
      // Jadval ro'yxatini yangilab, o'chirilgan jadval ochiq bo'lsa boshqasiga o'tamiz.
      const r = await metaQuery(
        ref,
        keys.service_key,
        `select table_name from information_schema.tables
         where table_schema='public' and table_type='BASE TABLE' order by table_name`,
      );
      const names = r.map((x) => String(x.table_name));
      setTables(names);
      if (active === name) {
        if (names.length > 0) await open(names[0]);
        else {
          setActive(null);
          setColumns([]);
          setPkCols([]);
          setRows([]);
          setTotal(0);
        }
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const typeMap = Object.fromEntries(columns.map((c) => [c.name, c.type]));
  const editableCols = columns.filter((c) => !c.identity);
  const isRequired = (c: Column) => !c.nullable && c.def === null;
  const missingRequired = editableCols.some(
    (c) => isRequired(c) && !(form[c.name] ?? "").trim(),
  );
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Table list */}
      <div className="flex w-full shrink-0 flex-col border-b border-border bg-surface md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
            {t.tables.schema}
          </span>
          <button
            className="text-faint transition hover:text-fg"
            onClick={loadTables}
            title={t.common.refresh}
          >
            <RefreshCw size={13} />
          </button>
        </div>
        <div className="max-h-44 overflow-auto px-2 pb-2 md:max-h-none md:flex-1">
          {tables.length === 0 && (
            <p className="px-2 py-2 text-xs text-faint">{t.tables.noTables}</p>
          )}
          {tables.map((tbl) => (
            <div
              key={tbl}
              className={`group flex items-center gap-0.5 rounded-lg pr-1 transition ${
                active === tbl ? "bg-brand/10" : "hover:bg-hover"
              }`}
            >
              <button
                onClick={() => open(tbl)}
                className={`flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-left text-[13px] ${
                  active === tbl
                    ? "font-medium text-brand"
                    : "text-secondary group-hover:text-fg"
                }`}
              >
                <Table2 size={14} className="shrink-0" />
                <span className="truncate">{tbl}</span>
              </button>
              <button
                onClick={() => renameTable(tbl)}
                className="shrink-0 rounded p-1 text-faint opacity-0 transition hover:text-fg focus:opacity-100 group-hover:opacity-100"
                title={t.tables.renameTable}
                aria-label={t.tables.renameTable}
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => dropTable(tbl)}
                className="shrink-0 rounded p-1 text-faint opacity-0 transition hover:text-danger focus:opacity-100 group-hover:opacity-100"
                title={t.tables.deleteTable}
                aria-label={t.tables.deleteTable}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex min-w-0 flex-1 flex-col">
        {!active ? (
          <div className="grid flex-1 place-items-center text-center">
            <div>
              <Database size={28} className="mx-auto mb-3 text-faint" />
              <p className="text-sm text-secondary">{t.tables.selectHint}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2 text-[13px]">
                <Table2 size={15} className="text-brand" />
                <span className="font-medium">{active}</span>
                <span className="text-faint">· {t.tables.rows(total)}</span>
              </div>
              <button className="btn" onClick={() => setShowInsert((v) => !v)}>
                <Plus size={14} /> {t.tables.addRow}
              </button>
            </div>

            {error && <div className="m-4 alert-danger text-xs">{error}</div>}

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-auto p-4">
                  <DataGrid
                    rows={rows}
                    types={typeMap}
                    emptyHint={t.tables.emptyRows}
                    deleteRowLabel={t.tables.deleteRowTooltip}
                    onDeleteRow={deleteRow}
                  />
                </div>
                {/* Pagination */}
                {total > PAGE_SIZE && (
                  <div className="flex h-10 shrink-0 items-center justify-between border-t border-border px-4 text-xs text-secondary">
                    <span>
                      {t.tables.page(
                        page * PAGE_SIZE + 1,
                        Math.min((page + 1) * PAGE_SIZE, total),
                        total,
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        className="btn-ghost btn-xs"
                        disabled={page === 0}
                        onClick={() => goPage(page - 1)}
                      >
                        <ChevronLeft size={14} /> {t.common.prev}
                      </button>
                      <span className="px-1 tabular-nums">
                        {page + 1} / {pageCount}
                      </span>
                      <button
                        className="btn-ghost btn-xs"
                        disabled={(page + 1) * PAGE_SIZE >= total}
                        onClick={() => goPage(page + 1)}
                      >
                        {t.common.next} <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {showInsert && (
                <div className="w-full shrink-0 overflow-auto border-t border-border bg-surface p-4 md:w-80 md:border-l md:border-t-0">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">{t.tables.newRow}</span>
                    <button
                      className="text-faint transition hover:text-fg"
                      onClick={() => setShowInsert(false)}
                      aria-label={t.common.close}
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div className="mb-3 space-y-1">
                    <p className="text-xs text-faint">{t.tables.defaultHint}</p>
                    {pkCols.length > 0 && (
                      <p className="text-xs text-faint">{t.tables.pkHint}</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    {editableCols.map((c) => (
                      <div key={c.name}>
                        <label className="mb-1 flex items-center gap-1.5 text-xs text-secondary">
                          <span>{c.name}</span>
                          <span className="col-type">{c.type}</span>
                          {isRequired(c) ? (
                            <span className="text-danger" title={t.tables.required}>
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
                          requiredLabel={t.tables.requiredPlaceholder}
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
                      {t.common.save}
                    </button>
                    {missingRequired && (
                      <p className="text-center text-xs text-faint">
                        <span className="text-danger">*</span> {t.tables.requiredFill}
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

function CellInput({
  column,
  value,
  onChange,
  requiredLabel,
}: {
  column: Column;
  value: string;
  onChange: (v: string) => void;
  requiredLabel: string;
}) {
  const required = !column.nullable && column.def === null;
  const placeholder = required ? requiredLabel : column.def !== null ? "default" : "NULL";

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

function shortDefault(def: string): string {
  const clean = def.replace(/::[a-z0-9_ ."[\]]+/gi, "").replace(/^'|'$/g, "").trim();
  return clean.length > 16 ? clean.slice(0, 16) + "…" : clean;
}

function shortType(t: string): string {
  const map: Record<string, string> = {
    bigint: "int8",
    integer: "int4",
    smallint: "int2",
    boolean: "bool",
    "character varying": "varchar",
    "timestamp with time zone": "timestamptz",
    "timestamp without time zone": "timestamp",
    "double precision": "float8",
    numeric: "numeric",
    text: "text",
    uuid: "uuid",
    jsonb: "jsonb",
    json: "json",
  };
  return map[t] ?? t;
}
