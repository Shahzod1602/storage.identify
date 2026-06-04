// SDK uchun to'liq end-to-end test. Ishlatish: tsx scripts/e2e.ts <apiUrl> <anonKey> <serviceKey>
import { createClient } from "../src/index.js";

const [apiUrl, anonKey, serviceKey] = process.argv.slice(2);
let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, extra = "") {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${extra ? " — " + extra : ""}`);
  ok ? pass++ : fail++;
}

const svc = createClient(apiUrl!, serviceKey!);

console.log("═══ from().insert + select ═══");
const ins = await svc.from("todos").insert([
  { title: "Service A", done: false },
  { title: "Service B", done: true },
]);
check("insert 2 qator", ins.error === null && Array.isArray(ins.data) && ins.data.length === 2, ins.error?.message);

const sel = await svc.from("todos").select("id,title,done").order("id");
check("select + order", sel.error === null && (sel.data as unknown[]).length >= 2);

console.log("═══ filtrlar + count ═══");
const filtered = await svc.from("todos").select("*", { count: "exact" }).eq("done", true);
check("eq filtri", filtered.error === null && (filtered.data as { done: boolean }[]).every((r) => r.done === true));
check("count qaytdi", typeof filtered.count === "number", `count=${filtered.count}`);

console.log("═══ auth: signUp + avtomatik authenticated ═══");
const user = createClient(apiUrl!, anonKey!);
const email = `sdk_${Date.now()}@example.com`;
const su = await user.auth.signUp({ email, password: "parol123" });
check("signUp", su.error === null && su.data?.user?.email === email, su.error?.message);
check("sessiya o'rnatildi", user.auth.getSession() !== null);

console.log("═══ RLS: user faqat o'zinikini ko'radi ═══");
await user.from("todos").insert({ title: "User todo" });
const userRows = await user.from("todos").select("title,owner");
const svcRows = await svc.from("todos").select("id");
check(
  "user faqat 1 ta (o'ziniki)",
  (userRows.data as unknown[]).length === 1,
  `user=${(userRows.data as unknown[]).length}, service=${(svcRows.data as unknown[]).length}`,
);

console.log("═══ rpc ═══");
const rpc = await svc.rpc<number>("qoshish", { a: 10, b: 32 });
check("rpc qoshish(10,32)=42", rpc.data === 42, rpc.error?.message ?? String(rpc.data));

console.log("═══ storage ═══");
await svc.storage.createBucket("sdk-bucket", { public: true });
const up = await svc.storage.from("sdk-bucket").upload("salom.txt", "Salom SDK!", { contentType: "text/plain" });
check("upload", up.error === null, up.error?.message);
const down = await svc.storage.from("sdk-bucket").download("salom.txt");
const txt = down.data ? await down.data.text() : "";
check("download", txt === "Salom SDK!", txt);
check("getPublicUrl", svc.storage.from("sdk-bucket").getPublicUrl("salom.txt").publicUrl.includes("/public/"));

console.log("═══ realtime: channel().on().subscribe() ═══");
await new Promise<void>((resolve) => {
  let got = false;
  const ch = svc
    .channel("todos")
    .on("INSERT", (p) => {
      if (!got && (p.record as { title?: string })?.title === "Realtime SDK") {
        got = true;
        check("realtime INSERT event", true);
        ch.unsubscribe();
        resolve();
      }
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await svc.from("todos").insert({ title: "Realtime SDK" });
      }
    });
  setTimeout(() => {
    if (!got) {
      check("realtime INSERT event", false, "timeout");
      resolve();
    }
  }, 5000);
});

console.log(`\n${pass} ✓ / ${fail} ✗`);
process.exit(fail === 0 ? 0 : 1);
