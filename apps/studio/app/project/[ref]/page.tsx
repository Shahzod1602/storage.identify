"use client";

import { useProject } from "@/components/project-context";
import { GATEWAY } from "@/lib/api";

function KeyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-edge/50 py-2 last:border-0">
      <span className="w-28 shrink-0 text-sm text-neutral-500">{label}</span>
      <code className="flex-1 truncate font-mono text-xs">{value}</code>
      <button
        className="btn-ghost text-xs"
        onClick={() => navigator.clipboard.writeText(value)}
      >
        nusxa
      </button>
    </div>
  );
}

export default function OverviewPage() {
  const { ref, keys, error } = useProject();

  if (error) return <div className="card text-red-400">{error}</div>;
  if (!keys) return <p className="text-neutral-500">Yuklanmoqda...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{keys.name}</h1>
        <p className="text-sm text-neutral-500">API kalitlari va ulanish</p>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-medium text-neutral-400">
          Loyiha sozlamalari
        </h2>
        <KeyRow label="API URL" value={`${GATEWAY}/v1/${ref}`} />
        <KeyRow label="anon key" value={keys.anon_key} />
        <KeyRow label="service key" value={keys.service_key} />
      </div>

      <div className="card text-sm text-neutral-400">
        <p className="mb-2 font-medium text-neutral-300">Tezkor boshlash</p>
        <pre className="overflow-x-auto rounded bg-black/40 p-3 font-mono text-xs">
          {`curl "${GATEWAY}/v1/${ref}/rest/v1/<jadval>" \\
  -H "apikey: <anon yoki service key>"`}
        </pre>
      </div>
    </div>
  );
}
