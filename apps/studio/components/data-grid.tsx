interface DataGridProps {
  rows: Record<string, unknown>[];
  /** Ustun -> tip (masalan {id: "int8"}). Bo'lsa header'da ko'rsatiladi. */
  types?: Record<string, string>;
  emptyHint?: string;
}

export function DataGrid({ rows, types, emptyHint }: DataGridProps) {
  if (!rows || rows.length === 0) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed border-border py-16 text-sm text-faint">
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
              <th key={c}>
                {c}
                {types?.[c] && <span className="col-type">{types[c]}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="w-12 text-center text-faint">{i + 1}</td>
              {cols.map((c) => (
                <td key={c}>
                  <Cell value={row[c]} />
                </td>
              ))}
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
