import { Trash2 } from "lucide-react";

interface DataGridProps {
  rows: Record<string, unknown>[];
  /** Ustun -> tip (masalan {id: "int8"}). Bo'lsa header'da ko'rsatiladi. */
  types?: Record<string, string>;
  emptyHint?: string;
  /** Berilsa, har qatorda o'chirish tugmasi chiqadi. */
  onDeleteRow?: (row: Record<string, unknown>) => void;
}

export function DataGrid({ rows, types, emptyHint, onDeleteRow }: DataGridProps) {
  if (!rows || rows.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border-strong py-16 text-sm text-faint">
        {emptyHint ?? "Ma'lumot yo'q."}
      </div>
    );
  }
  const cols = Object.keys(rows[0]);

  return (
    <div className="grid-wrap max-h-full">
      <table className="grid">
        <thead>
          <tr>
            <th className="w-12 text-center text-faint">#</th>
            {cols.map((c) => (
              <th key={c} scope="col">
                {c}
                {types?.[c] && <span className="col-type">{types[c]}</span>}
              </th>
            ))}
            {onDeleteRow && <th className="w-10" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="group">
              <td className="w-12 text-center text-faint">{i + 1}</td>
              {cols.map((c) => (
                <td key={c}>
                  <Cell value={row[c]} />
                </td>
              ))}
              {onDeleteRow && (
                <td className="w-10 text-center">
                  <button
                    onClick={() => onDeleteRow(row)}
                    className="text-faint opacity-0 transition hover:text-danger group-hover:opacity-100"
                    title="Qatorni o'chirish"
                    aria-label="Qatorni o'chirish"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="italic text-faint">NULL</span>;
  }
  if (typeof value === "boolean") {
    return <span className={value ? "text-brand" : "text-muted"}>{String(value)}</span>;
  }
  if (typeof value === "object") {
    return <span className="text-muted">{JSON.stringify(value)}</span>;
  }
  return <span className="block max-w-xs truncate">{String(value)}</span>;
}
