// Gateway bilan ishlovchi mijoz. Admin endpointlar admin-token bilan,
// loyiha ichidagi amallar (meta/query) service_key bilan ishlaydi.

export const GATEWAY =
  process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8000";

const SESSION_KEY = "sdb_session";

// ── Sessiya (login) ── admin token client'ga bakelashmaydi.
export function getSession(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}
export function setSession(token: string): void {
  localStorage.setItem(SESSION_KEY, token);
}
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
export function isAuthed(): boolean {
  return !!getSession();
}

/** Email + parol bilan login -> sessiya token saqlanadi. */
export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${GATEWAY}/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Login muvaffaqiyatsiz");
  setSession(data.token);
}

export interface Me {
  email: string;
  role: "super_admin" | "user";
}
export async function getMe(): Promise<Me> {
  return jsonOrThrow(
    await fetch(`${GATEWAY}/admin/me`, { headers: adminHeaders(), cache: "no-store" }),
  );
}

// ── Platform foydalanuvchilari (super admin) ──
export interface PlatformUser {
  id: string;
  email: string;
  role: "super_admin" | "user";
  created_at: string;
}
export async function listUsers(): Promise<PlatformUser[]> {
  return jsonOrThrow(
    await fetch(`${GATEWAY}/admin/users`, { headers: adminHeaders(), cache: "no-store" }),
  );
}
export async function createUser(
  email: string,
  password: string,
  role: "user" | "super_admin" = "user",
): Promise<PlatformUser> {
  return jsonOrThrow(
    await fetch(`${GATEWAY}/admin/users`, {
      method: "POST",
      headers: adminHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ email, password, role }),
    }),
  );
}
export async function deleteUser(id: string): Promise<void> {
  await fetch(`${GATEWAY}/admin/users/${id}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
}

export function logout(): void {
  clearSession();
  if (typeof window !== "undefined") window.location.href = "/login";
}

/** Admin so'rovlar uchun header (Bearer sessiya). */
function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { authorization: `Bearer ${getSession() ?? ""}`, ...extra };
}

async function jsonOrThrow(res: Response) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (res.status === 401 && typeof window !== "undefined") {
    clearSession();
    window.location.href = "/login";
  }
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
      headers: adminHeaders(),
      cache: "no-store",
    }),
  );
}

export async function createProject(name: string): Promise<ProjectKeys> {
  return jsonOrThrow(
    await fetch(`${GATEWAY}/admin/projects`, {
      method: "POST",
      headers: adminHeaders({ "content-type": "application/json" }),
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
      headers: adminHeaders(),
      cache: "no-store",
    }),
  );
}

export async function getKeys(ref: string): Promise<ProjectKeys> {
  return jsonOrThrow(
    await fetch(`${GATEWAY}/admin/projects/${ref}/keys`, {
      headers: adminHeaders(),
      cache: "no-store",
    }),
  );
}

/** Loyiha jadvallaridan generatsiya qilingan TypeScript turlari (admin). */
export async function getTypes(ref: string): Promise<string> {
  const res = await fetch(`${GATEWAY}/admin/projects/${ref}/types`, {
    headers: adminHeaders(),
    cache: "no-store",
  });
  if (res.status === 401 && typeof window !== "undefined") {
    clearSession();
    window.location.href = "/login";
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
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
