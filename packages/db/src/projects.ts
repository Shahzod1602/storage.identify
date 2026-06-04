import type { Project } from "@storagedb/types";
import { platform } from "./client.js";
import { decryptSecret } from "./crypto.js";

interface ProjectRow {
  id: string;
  ref: string;
  organization_id: string;
  name: string;
  db_name: string;
  jwt_secret: string;
  owner_id: string | null;
  created_at: string;
}

function toProject(r: ProjectRow): Project {
  return {
    id: r.id,
    ref: r.ref,
    organizationId: r.organization_id,
    name: r.name,
    dbName: r.db_name,
    jwtSecret: decryptSecret(r.jwt_secret), // DB'da shifrlangan -> xotirada plaintext
    ownerId: r.owner_id,
    createdAt: r.created_at,
  };
}

const COLS = `id, ref, organization_id, name, db_name, jwt_secret, owner_id, created_at`;

/** ref bo'yicha loyihani topadi (gateway routing uchun). null = topilmadi. */
export async function getProjectByRef(ref: string): Promise<Project | null> {
  const sql = platform();
  const rows = await sql<ProjectRow[]>`
    select ${sql.unsafe(COLS)} from projects
    where ref = ${ref} and status = 'active'
    limit 1
  `;
  return rows.length ? toProject(rows[0]!) : null;
}

/**
 * Loyihalar ro'yxati. ownerId berilsa faqat o'sha egasinikini qaytaradi
 * (oddiy user); berilmasa hammasini (super admin).
 */
export async function listProjects(ownerId?: string): Promise<Project[]> {
  const sql = platform();
  const rows = ownerId
    ? await sql<ProjectRow[]>`
        select ${sql.unsafe(COLS)} from projects
        where owner_id = ${ownerId}
        order by created_at desc`
    : await sql<ProjectRow[]>`
        select ${sql.unsafe(COLS)} from projects
        order by created_at desc`;
  return rows.map(toProject);
}
