import { createHmac } from "node:crypto";
import { getConfig } from "@storagedb/config";

/** proj_<ref> uchun login (authenticator) rol nomi. */
export function authenticatorRole(ref: string): string {
  return `proj_${ref}_authenticator`;
}

/** authenticator rol parolini PLATFORM_SECRET'dan deterministik hosil qiladi. */
export function authenticatorPassword(ref: string): string {
  return createHmac("sha256", getConfig().PLATFORM_SECRET)
    .update(`authenticator:${ref}`)
    .digest("hex");
}

/**
 * Loyiha database'iga authenticator rol orqali ulanish URL'ini quradi.
 * Host/port PROJECTS_DATABASE_URL'dan olinadi; user/parol/db almashtiriladi.
 */
export function projectAuthUrl(ref: string, dbName: string): string {
  const url = new URL(getConfig().PROJECTS_DATABASE_URL);
  url.username = authenticatorRole(ref);
  url.password = authenticatorPassword(ref);
  url.pathname = `/${dbName}`;
  return url.toString();
}
