import type { Project } from "@storagedb/types";
import { platform } from "./client.js";

interface ProjectRow {
  id: string;
  ref: string;
  organization_id: string;
  name: string;
  db_name: string;
  jwt_secret: string;
  created_at: string;
}

function toProject(r: ProjectRow): Project {
  return {
    id: r.id,
    ref: r.ref,
    organizationId: r.organization_id,
    name: r.name,
    dbName: r.db_name,
    jwtSecret: r.jwt_secret,
    createdAt: r.created_at,
  };
}

/** ref bo'yicha loyihani topadi (gateway routing uchun). null = topilmadi. */
export async function getProjectByRef(ref: string): Promise<Project | null> {
  const sql = platform();
  const rows = await sql<ProjectRow[]>`
    select id, ref, organization_id, name, db_name, jwt_secret, created_at
    from projects
    where ref = ${ref} and status = 'active'
    limit 1
  `;
  return rows.length ? toProject(rows[0]!) : null;
}

/** Barcha loyihalar ro'yxati (dashboard uchun). */
export async function listProjects(): Promise<Project[]> {
  const sql = platform();
  const rows = await sql<ProjectRow[]>`
    select id, ref, organization_id, name, db_name, jwt_secret, created_at
    from projects
    order by created_at desc
  `;
  return rows.map(toProject);
}
