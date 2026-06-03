import { getProjectByRef, closeAll } from "../src/index.js";
import { signJwt } from "@storagedb/jwt";
const ref = process.argv[2]!;
const sub = process.argv[3]!;
const project = await getProjectByRef(ref);
if (!project) throw new Error(`Loyiha topilmadi: ${ref}`);
// getProjectByRef jwt_secret'ni avtomatik deshifrlaydi.
const token = await signJwt(project.jwtSecret, "authenticated", {
  sub,
  expiresIn: "1h",
});
console.log(token);
await closeAll();
