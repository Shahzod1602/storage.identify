import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform, closeAll } from "./client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

/**
 * Control-plane migratsiyalarini tartib bilan qo'llaydi.
 * Allaqachon qo'llanganlarini `_migrations` jadvali orqali o'tkazib yuboradi.
 */
export async function runMigrations(): Promise<void> {
  const sql = platform();

  await sql`
    create table if not exists _migrations (
      name        text primary key,
      applied_at  timestamptz not null default now()
    )
  `;

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = await sql<{ name: string }[]>`select name from _migrations`;
  const appliedSet = new Set(applied.map((r) => r.name));

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  o'tkazildi (allaqachon): ${file}`);
      continue;
    }
    const content = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    console.log(`  qo'llanmoqda: ${file}`);
    // Har migratsiya bitta tranzaksiyada.
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`insert into _migrations (name) values (${file})`;
    });
  }

  console.log("✓ Migratsiyalar tugadi.");
}

// To'g'ridan-to'g'ri ishga tushirilganda (pnpm db:migrate).
// Eslatma: fileURLToPath ishlatamiz, chunki yo'lda bo'sh joy bo'lsa
// import.meta.url uni %20 qilib kodlaydi va oddiy solishtiruv ishlamaydi.
const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  runMigrations()
    .then(() => closeAll())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("✗ Migratsiya xatosi:", err);
      process.exit(1);
    });
}
