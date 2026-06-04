import client from "prom-client";
import { platform, listProjects } from "@storagedb/db";

// Prometheus regist ri — Grafana shu /metrics'ni scrape qiladi.
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry }); // gateway CPU/RAM/event-loop

const httpRequests = new client.Counter({
  name: "sdb_http_requests_total",
  help: "Loyiha bo'yicha HTTP so'rovlar soni",
  labelNames: ["project", "kind", "status"],
  registers: [registry],
});
const httpDuration = new client.Histogram({
  name: "sdb_http_request_duration_seconds",
  help: "So'rov davomiyligi (sekund)",
  labelNames: ["project", "kind"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});
const realtimeGauge = new client.Gauge({
  name: "sdb_realtime_connections",
  help: "Aktiv realtime (WebSocket) ulanishlar",
  labelNames: ["project"],
  registers: [registry],
});
const dbBytesGauge = new client.Gauge({
  name: "sdb_project_db_bytes",
  help: "Loyiha database hajmi (bayt)",
  labelNames: ["project"],
  registers: [registry],
});
const dbConnGauge = new client.Gauge({
  name: "sdb_project_db_connections",
  help: "Loyiha DB'ga aktiv ulanishlar",
  labelNames: ["project"],
  registers: [registry],
});

// ── In-memory agregator (studio Reports JSON uchun) ────────────────────
interface Agg {
  count: number;
  errors: number;
  lat: number[]; // oxirgi N latency (ms)
}
const agg = new Map<string, Agg>();
const rtCounts = new Map<string, number>();
let dbSizes = new Map<string, number>();
let dbConnCounts = new Map<string, number>();

/** URL'dan loyiha ref va xizmat turini ajratadi. */
export function parseUrl(url: string): { project: string; kind: string } {
  const path = url.split("?")[0] ?? url;
  const m = path.match(/^\/v1\/([a-z0-9]+)\/(rest|auth|storage|realtime|meta)/);
  if (m) return { project: m[1]!, kind: m[2]! };
  if (path.startsWith("/admin")) return { project: "system", kind: "admin" };
  return { project: "system", kind: "other" };
}

/** Har so'rov yakunida chaqiriladi (onResponse hook). */
export function recordRequest(
  url: string,
  status: number,
  durationMs: number,
): void {
  const { project, kind } = parseUrl(url);
  const statusClass = `${Math.floor(status / 100)}xx`;
  httpRequests.inc({ project, kind, status: statusClass });
  httpDuration.observe({ project, kind }, durationMs / 1000);
  if (project !== "system") {
    let a = agg.get(project);
    if (!a) {
      a = { count: 0, errors: 0, lat: [] };
      agg.set(project, a);
    }
    a.count++;
    if (status >= 400) a.errors++;
    a.lat.push(durationMs);
    if (a.lat.length > 300) a.lat.shift();
  }
}

export function realtimeConnect(ref: string): void {
  const n = (rtCounts.get(ref) ?? 0) + 1;
  rtCounts.set(ref, n);
  realtimeGauge.set({ project: ref }, n);
}
export function realtimeDisconnect(ref: string): void {
  const n = Math.max(0, (rtCounts.get(ref) ?? 0) - 1);
  rtCounts.set(ref, n);
  realtimeGauge.set({ project: ref }, n);
}

export async function metricsText(): Promise<string> {
  return registry.metrics();
}
export const metricsContentType = registry.contentType;

// ── Periodik DB gauge yig'uvchi (har 30s) ──────────────────────────────
async function collect(): Promise<void> {
  const sql = platform();
  const sizes = await sql<{ datname: string; bytes: string }[]>`
    select datname, pg_database_size(datname)::text as bytes
    from pg_database where datname like 'proj_%'
  `;
  dbSizes = new Map();
  for (const r of sizes) {
    const ref = r.datname.replace(/^proj_/, "");
    const b = Number(r.bytes);
    dbSizes.set(ref, b);
    dbBytesGauge.set({ project: ref }, b);
  }
  const conns = await sql<{ datname: string; n: number }[]>`
    select datname, count(*)::int as n from pg_stat_activity
    where datname like 'proj_%' group by datname
  `;
  dbConnCounts = new Map();
  for (const r of conns) {
    const ref = r.datname.replace(/^proj_/, "");
    dbConnCounts.set(ref, r.n);
    dbConnGauge.set({ project: ref }, r.n);
  }
}

let timer: NodeJS.Timeout | null = null;
export function startMetricsCollector(): void {
  if (timer) return;
  void collect().catch(() => {});
  timer = setInterval(() => void collect().catch(() => {}), 30_000);
}
export function stopMetricsCollector(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

// ── Reports JSON (studio sahifasi uchun) ───────────────────────────────
export interface ProjectMetrics {
  ref: string;
  name: string;
  requests: number;
  errors: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  dbBytes: number;
  dbConnections: number;
  realtimeConnections: number;
}

export async function metricsSummary(): Promise<ProjectMetrics[]> {
  const projects = await listProjects();
  return projects.map((p) => {
    const a = agg.get(p.ref);
    const lat = a?.lat ?? [];
    const sorted = [...lat].sort((x, y) => x - y);
    const p95 = sorted.length ? (sorted[Math.floor(sorted.length * 0.95)] ?? 0) : 0;
    const avg = lat.length ? lat.reduce((s, x) => s + x, 0) / lat.length : 0;
    return {
      ref: p.ref,
      name: p.name,
      requests: a?.count ?? 0,
      errors: a?.errors ?? 0,
      avgLatencyMs: Math.round(avg * 10) / 10,
      p95LatencyMs: Math.round(p95 * 10) / 10,
      dbBytes: dbSizes.get(p.ref) ?? 0,
      dbConnections: dbConnCounts.get(p.ref) ?? 0,
      realtimeConnections: rtCounts.get(p.ref) ?? 0,
    };
  });
}
