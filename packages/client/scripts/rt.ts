import { createClient } from "../src/index.js";
const [apiUrl, anonKey] = process.argv.slice(2);
const A = createClient(apiUrl!, anonKey!);
const B = createClient(apiUrl!, anonKey!);
let gotBroadcast = false;
await new Promise<void>((resolve) => {
  let subs = 0;
  const chB = B.channel("room1")
    .onBroadcast("msg", (m) => { gotBroadcast = (m.payload as { hello?: string }).hello === "from A"; })
    .onPresenceSync(() => {})
    .subscribe((s) => { if (s === "SUBSCRIBED" && ++subs === 2) start(); });
  const chA = A.channel("room1")
    .onPresenceSync(() => {})
    .subscribe((s) => { if (s === "SUBSCRIBED" && ++subs === 2) start(); });
  function start() {
    chA.track({ user: "A" });
    chB.track({ user: "B" });
    setTimeout(() => chA.send("msg", { hello: "from A" }), 400);
    setTimeout(() => {
      const st = chA.presenceState();
      const presenceOk = Object.keys(st).length === 2;
      console.log("  broadcast B oldi:", gotBroadcast, "| presence kalitlar:", Object.keys(st).length);
      console.log(gotBroadcast && presenceOk ? "  ✅ broadcast + presence OK" : "  ❌ FAIL");
      resolve();
    }, 1500);
  }
});
process.exit(0);
