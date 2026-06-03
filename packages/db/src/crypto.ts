import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { getConfig } from "@storagedb/config";

// jwt_secret kabi maxfiy qiymatlarni control-plane DB'da SHIFRLAB saqlash uchun.
// AES-256-GCM; kalit PLATFORM_SECRET'dan scrypt bilan olinadi.
// DB o'g'irlansa ham, PLATFORM_SECRET bo'lmasa qiymatlar ochilmaydi.

const PREFIX = "enc:";
let keyCache: Buffer | null = null;

function key(): Buffer {
  if (!keyCache) {
    // Fixed salt — maxfiylik PLATFORM_SECRET'da. 32 bayt = AES-256.
    keyCache = scryptSync(getConfig().PLATFORM_SECRET, "storagedb-jwt-enc", 32);
  }
  return keyCache;
}

/** Matnni shifrlaydi: "enc:<iv>:<tag>:<cipher>" (base64). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

/**
 * Shifrlangan qiymatni ochadi. Agar "enc:" prefiksi bo'lmasa — eski plaintext
 * deb hisoblanadi va o'zgarishsiz qaytadi (orqaga moslik).
 */
export function decryptSecret(value: string): string {
  if (!value.startsWith(PREFIX)) return value;
  const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Shifrlangan qiymat formati noto'g'ri");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Qiymat allaqachon shifrlanganmi? */
export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}
