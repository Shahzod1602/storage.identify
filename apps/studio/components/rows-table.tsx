export function RowsTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-neutral-500">Natija yo'q.</p>;
  }
  const cols = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto rounded-lg border border-edge">
      <table className="data">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c} className="max-w-xs truncate font-mono text-xs">
                  {format(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function format(value: unknown): string {
  if (value === null || value === undefined) return "∅";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
