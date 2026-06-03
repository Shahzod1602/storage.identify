import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// scrypt — Node built-in, native modul kerak emas. Argon2'ga keyin o'tish mumkin.
const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

/** Parolni xavfsiz hashlaydi: "scrypt$<salt_hex>$<hash_hex>". */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/** Parolni saqlangan hash bilan (vaqt-xavfsiz) solishtiradi. */
export async function verifyPassword(
  password: string,
  stored: string | null,
): Promise<boolean> {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
