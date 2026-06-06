import postgres from "postgres";
import { getConfig } from "@storagedb/config";
import type { Project } from "@storagedb/types";
import type { Sql } from "./client.js";
import { projectAuthUrl } from "./roles.js";

// Har loyiha uchun keshlangan ulanish pooli (authenticator rol bilan).
// Map insertion-order LRU sifatida ishlaydi: oxirgi ishlatilgan -> oxirida.
const pools = new Map<string, Sql>();

// Bir vaqtda ochiq pool'lar chegarasi — minglab loyihada connection exhaustion
// bo'lmasligi uchun eng kam ishlatilgani (LRU) yopiladi.
const MAX_POOLS = 50;

/**
 * Loyiha database'iga authenticator rol orqali ulanadigan pool qaytaradi.
 * REST/Auth/Storage servislari shu pool orqali so'rov bajaradi va
 * har so'rovda SET LOCAL role qilib RLS'ni faollashtiradi.
 */
export function getProjectPool(project: Project): Sql {
  const existing = pools.get(project.ref);
  if (existing) {
    // LRU: qayta ishlatildi -> Map oxiriga ko'chiramiz.
    pools.delete(project.ref);
    pools.set(project.ref, existing);
    return existing;
  }

  const pool = postgres(projectAuthUrl(project.ref, project.dbName), {
    max: 5,
    idle_timeout: 30,
    onnotice: () => {},
    // Og'ir/osilib qolgan so'rovlarni avtomatik to'xtatadi (DoS himoyasi).
    connection: { statement_timeout: getConfig().STATEMENT_TIMEOUT_MS },
  });
  pools.set(project.ref, pool);

  // Chegaradan oshsa — eng eski (kam ishlatilgan) poolni yopamiz.
  if (pools.size > MAX_POOLS) {
    const oldest = pools.keys().next().value as string | undefined;
    if (oldest && oldest !== project.ref) {
      const old = pools.get(oldest);
      pools.delete(oldest);
      // Faol so'rovlar tugashini kutib yopadi (fire-and-forget).
      void old?.end({ timeout: 5 }).catch(() => {});
    }
  }
  return pool;
}

/** Barcha loyiha poollarini yopadi (graceful shutdown). */
export async function closeProjectPools(): Promise<void> {
  await Promise.all([...pools.values()].map((p) => p.end({ timeout: 5 })));
  pools.clear();
}
