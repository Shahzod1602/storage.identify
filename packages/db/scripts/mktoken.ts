import { platform, closeAll } from "../src/index.js";
import { signJwt } from "@storagedb/jwt";
const ref = process.argv[2]!;
const sub = process.argv[3]!;
const sql = platform();
const [row] = await sql<{ jwt_secret: string }[]>`select jwt_secret from projects where ref = ${ref}`;
const token = await signJwt(row!.jwt_secret, "authenticated", { sub, expiresIn: "1h" });
console.log(token);
await closeAll();
