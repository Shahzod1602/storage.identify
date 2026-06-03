import postgres from "postgres";
import type { Project } from "@storagedb/types";
import type { Sql } from "./client.js";
import { projectAuthUrl } from "./roles.js";

// Har loyiha uchun keshlangan ulanish pooli (authenticator rol bilan).
const pools = new Map<string, Sql>();

/**
 * Loyiha database'iga authenticator rol orqali ulanadigan pool qaytaradi.
 * REST/Auth/Storage servislari shu pool orqali so'rov bajaradi va
 * har so'rovda SET LOCAL role qilib RLS'ni faollashtiradi.
 */
export function getProjectPool(project: Project): Sql {
  let pool = pools.get(project.ref);
  if (!pool) {
    pool = postgres(projectAuthUrl(project.ref, project.dbName), {
      max: 5,
      idle_timeout: 30,
      onnotice: () => {},
    });
    pools.set(project.ref, pool);
  }
  return pool;
}

/** Barcha loyiha poollarini yopadi (graceful shutdown). */
export async function closeProjectPools(): Promise<void> {
  await Promise.all([...pools.values()].map((p) => p.end({ timeout: 5 })));
  pools.clear();
}
