// Mavjud loyiha DB'lariga auth email-token ustunlarini qo'shadi (idempotent).
// Yangi loyihalar buni bootstrap'dan oladi. Ishlatish: tsx scripts/alter-auth.ts
import { getConfig } from "@storagedb/config";
import { listProjects, connect, closeAll } from "../src/index.js";

const ALTERS = `
  alter table auth.users add column if not exists confirmation_token text;
  alter table auth.users add column if not exists recovery_token text;
  alter table auth.users add column if not exists recovery_sent_at timestamptz;
`;

const base = new URL(getConfig().PROJECTS_DATABASE_URL);
const projects = await listProjects();
console.log(`${projects.length} loyiha topildi`);

for (const p of projects) {
  const url = new URL(base.toString());
  url.pathname = `/${p.dbName}`;
  const db = connect(url.toString());
  try {
    await db.unsafe(ALTERS);
    console.log(`  ✓ ${p.dbName}`);
  } catch (e) {
    console.log(`  ✗ ${p.dbName}: ${(e as Error).message}`);
  } finally {
    await db.end({ timeout: 5 });
  }
}

await closeAll();
console.log("✓ tugadi");
