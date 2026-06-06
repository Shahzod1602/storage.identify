// Mavjud loyiha DB'lariga "RLS auto-enable" event trigger'ini qo'shadi (idempotent).
// Yangi loyihalar buni bootstrap'dan oladi. Ishlatish: tsx scripts/enable-rls.ts
//
// DIQQAT: bu faqat KEYINGI yaratiladigan jadvallarga RLS yoqadi. Allaqachon mavjud
// jadvallarga RLS yoqilmaydi (jonli ilovalarni buzmaslik uchun) — ularga kerak bo'lsa
// qo'lda `alter table public.<t> enable row level security` + policy qo'shing.
import { getConfig } from "@storagedb/config";
import { listProjects, connect, closeAll } from "../src/index.js";

const SQL = `
create or replace function auth.enable_rls_on_create() returns event_trigger
  language plpgsql security definer as $erls$
declare
  obj record;
begin
  for obj in select * from pg_event_trigger_ddl_commands() loop
    if obj.object_type = 'table' and obj.schema_name = 'public' then
      execute format('alter table %s enable row level security', obj.object_identity);
    end if;
  end loop;
end;
$erls$;

drop event trigger if exists trg_enable_rls;
create event trigger trg_enable_rls on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function auth.enable_rls_on_create();
`;

const base = new URL(getConfig().PROJECTS_DATABASE_URL);
const projects = await listProjects();
console.log(`${projects.length} loyiha topildi`);

for (const p of projects) {
  const url = new URL(base.toString());
  url.pathname = `/${p.dbName}`;
  const db = connect(url.toString());
  try {
    await db.unsafe(SQL);
    console.log(`  ✓ ${p.dbName}`);
  } catch (e) {
    console.log(`  ✗ ${p.dbName}: ${(e as Error).message}`);
  } finally {
    await db.end({ timeout: 5 });
  }
}

await closeAll();
console.log("✓ tugadi");
