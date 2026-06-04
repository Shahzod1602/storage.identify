// Platforma bo'ylab umumiy tiplar.

/** Loyihadagi Postgres rollari (Supabase modeliga mos). */
export type ProjectRole = "anon" | "authenticated" | "service_role";

/** Control-plane'dagi loyiha yozuvi. */
export interface Project {
  id: string;
  ref: string; // qisqa, URL-xavfsiz identifikator (masalan "ab12cd34ef")
  organizationId: string;
  name: string;
  dbName: string; // proj_<ref>
  jwtSecret: string; // shu loyiha JWT'larini imzolash/tekshirish uchun
  ownerId: string | null; // platform_users.id (loyiha egasi)
  createdAt: string;
}

/** Loyiha yaratilganda bir marta qaytariladigan API kalitlar. */
export interface ProjectKeys {
  ref: string;
  anonKey: string; // anon rol uchun JWT (uzoq muddatli)
  serviceKey: string; // service_role uchun JWT (RLS'ni chetlab o'tadi) — maxfiy!
}

/** JWT ichidagi claims (Supabase'ga mos). */
export interface JwtClaims {
  sub?: string; // foydalanuvchi id (auth bo'lsa)
  role: ProjectRole;
  iss?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

/** Gateway so'rovida aniqlangan loyiha konteksti. */
export interface ProjectContext {
  project: Project;
  role: ProjectRole;
  claims: JwtClaims;
}
