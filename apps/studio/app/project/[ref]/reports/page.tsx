"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Gauge,
  Database,
  Radio,
  Plug,
} from "lucide-react";
import { useProject } from "@/components/project-context";
import { getMetrics, type ProjectMetrics } from "@/lib/api";

const POLL_MS = 3000;
const HISTORY = 40;

export default function ReportsPage() {
  const { ref } = useProject();
  const [m, setM] = useState<ProjectMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latHist, setLatHist] = useState<number[]>([]);
  const [reqHist, setReqHist] = useState<number[]>([]);
  const lastReq = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const all = await getMetrics();
        const mine = all.find((x) => x.ref === ref) ?? null;
        if (!alive) return;
        setM(mine);
        setError(null);
        if (mine) {
          setLatHist((h) => [...h, mine.avgLatencyMs].slice(-HISTORY));
          const delta =
            lastReq.current === null ? 0 : Math.max(0, mine.requests - lastReq.current);
          lastReq.current = mine.requests;
          setReqHist((h) => [...h, delta].slice(-HISTORY));
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    }
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [ref]);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-5xl px-8 py-8">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-xl font-medium">Hisobotlar</h1>
          <span className="flex items-center gap-1.5 text-xs text-faint">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
            jonli ({POLL_MS / 1000}s)
          </span>
        </div>
        <p className="mb-6 text-sm text-muted">
          Loyiha resurslari va so'rov statistikasi
        </p>

        {error && <div className="alert-danger mb-5">{error}</div>}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Stat
            icon={Activity}
            label="So'rovlar (jami)"
            value={m?.requests ?? 0}
          />
          <Stat
            icon={AlertTriangle}
            label="Xatolar"
            value={m?.errors ?? 0}
            danger={(m?.errors ?? 0) > 0}
          />
          <Stat
            icon={Gauge}
            label="O'rtacha kechikish"
            value={`${m?.avgLatencyMs ?? 0} ms`}
          />
          <Stat icon={Gauge} label="p95 kechikish" value={`${m?.p95LatencyMs ?? 0} ms`} />
          <Stat
            icon={Database}
            label="DB hajmi"
            value={formatBytes(m?.dbBytes ?? 0)}
          />
          <Stat
            icon={Radio}
            label="Realtime ulanishlar"
            value={m?.realtimeConnections ?? 0}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="So'rovlar / interval"
            data={reqHist}
            color="#10b981"
            unit=""
          />
          <ChartCard
            title="O'rtacha kechikish (ms)"
            data={latHist}
            color="#0ea5e9"
            unit="ms"
          />
        </div>

        <div className="mt-6 card flex items-center gap-3 p-4 text-sm text-muted">
          <Plug size={16} className="text-brand" />
          <span>
            Server CPU/RAM, tarixiy grafiklar va alertlar uchun{" "}
            <span className="text-fg">Grafana</span>'ni ishga tushiring:{" "}
            <code className="kbd">docker compose -f docker/docker-compose.observability.yml up -d</code>{" "}
            → <span className="text-fg">localhost:3002</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs text-faint">
        <Icon size={14} />
        {label}
      </div>
      <div
        className={`mt-2 text-2xl font-semibold tracking-tight ${danger ? "text-danger" : "text-fg"}`}
      >
        {value}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  data,
  color,
  unit,
}: {
  title: string;
  data: number[];
  color: string;
  unit: string;
}) {
  const max = Math.max(1, ...data);
  const last = data[data.length - 1] ?? 0;
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted">{title}</span>
        <span className="font-mono text-sm text-fg">
          {last}
          {unit}
        </span>
      </div>
      <Sparkline data={data} color={color} max={max} />
    </div>
  );
}

function Sparkline({
  data,
  color,
  max,
}: {
  data: number[];
  color: string;
  max: number;
}) {
  const W = 100;
  const H = 36;
  if (data.length < 2) {
    return (
      <div className="grid h-[36px] place-items-center text-xs text-faint">
        ma'lumot yig'ilmoqda...
      </div>
    );
  }
  const step = W / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${H - (v / max) * H}`).join(" ");
  const area = `0,${H} ${pts} ${W},${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-9 w-full">
      <polygon points={area} fill={color} opacity={0.12} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
