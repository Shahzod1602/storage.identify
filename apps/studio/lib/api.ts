// Gateway bilan ishlovchi mijoz. Admin endpointlar admin-token bilan,
// loyiha ichidagi amallar (meta/query) service_key bilan ishlaydi.

export const GATEWAY =
  process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8000";
const ADMIN_TOKEN =
  process.env.NEXT_PUBLIC_ADMIN_TOKEN ?? "dev-admin-token-change-me";

async function jsonOrThrow(res: Response) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }
  return data;
}

export interface ProjectSummary {
  ref: string;
  name: string;
  db_name: string;
  created_at: string;
}

export interface ProjectKeys {
  ref: string;
  name: string;
  anon_key: string;
  service_key: string;
  api_url: string;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  return jsonOrThrow(
    await fetch(`${GATEWAY}/admin/projects`, {
      headers: { "x-admin-token": ADMIN_TOKEN },
      cache: "no-store",
    }),
  );
}

export async function createProject(name: string): Promise<ProjectKeys> {
  return jsonOrThrow(
    await fetch(`${GATEWAY}/admin/projects`, {
      method: "POST",
      headers: { "x-admin-token": ADMIN_TOKEN, "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  );
}

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

export async function getMetrics(): Promise<ProjectMetrics[]> {
  return jsonOrThrow(
    await fetch(`${GATEWAY}/admin/metrics`, {
      headers: { "x-admin-token": ADMIN_TOKEN },
      cache: "no-store",
    }),
  );
}

export async function getKeys(ref: string): Promise<ProjectKeys> {
  return jsonOrThrow(
    await fetch(`${GATEWAY}/admin/projects/${ref}/keys`, {
      headers: { "x-admin-token": ADMIN_TOKEN },
      cache: "no-store",
    }),
  );
}

/** Loyiha DB'sida SQL bajaradi (service_key bilan). */
export async function metaQuery(
  ref: string,
  serviceKey: string,
  query: string,
): Promise<Record<string, unknown>[]> {
  const data = await jsonOrThrow(
    await fetch(`${GATEWAY}/v1/${ref}/meta/query`, {
      method: "POST",
      headers: { apikey: serviceKey, "content-type": "application/json" },
      body: JSON.stringify({ query }),
    }),
  );
  return data.rows ?? [];
}
