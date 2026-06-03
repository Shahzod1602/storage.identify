import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import type { JwtClaims, ProjectRole } from "@storagedb/types";

const ALG = "HS256";

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export interface SignOptions {
  /** Amal qilish muddati (jose formatida, masalan "1h", "7d", "10y"). */
  expiresIn?: string;
  sub?: string;
  issuer?: string;
  /** Qo'shimcha claim'lar. */
  extra?: Record<string, unknown>;
}

/** Loyiha jwtSecret bilan rol uchun JWT imzolaydi. */
export async function signJwt(
  secret: string,
  role: ProjectRole,
  opts: SignOptions = {},
): Promise<string> {
  const builder = new SignJWT({ role, ...(opts.extra ?? {}) })
    .setProtectedHeader({ alg: ALG, typ: "JWT" })
    .setIssuedAt();

  if (opts.issuer) builder.setIssuer(opts.issuer);
  if (opts.sub) builder.setSubject(opts.sub);
  if (opts.expiresIn) builder.setExpirationTime(opts.expiresIn);

  return builder.sign(secretKey(secret));
}

export class JwtError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "expired"
      | "invalid"
      | "malformed" = "invalid",
  ) {
    super(message);
    this.name = "JwtError";
  }
}

/** JWT'ni loyiha jwtSecret bilan tekshiradi va claims'ni qaytaradi. */
export async function verifyJwt(
  secret: string,
  token: string,
): Promise<JwtClaims> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), {
      algorithms: [ALG],
    });
    const role = payload.role;
    if (role !== "anon" && role !== "authenticated" && role !== "service_role") {
      throw new JwtError("JWT'da yaroqsiz 'role' claim", "invalid");
    }
    return payload as unknown as JwtClaims;
  } catch (err) {
    if (err instanceof JwtError) throw err;
    if (err instanceof joseErrors.JWTExpired) {
      throw new JwtError("JWT muddati o'tgan", "expired");
    }
    if (err instanceof joseErrors.JOSEError) {
      throw new JwtError("JWT yaroqsiz", "invalid");
    }
    throw new JwtError("JWT'ni o'qib bo'lmadi", "malformed");
  }
}

/**
 * Loyiha uchun standart anon va service_role kalitlarini generatsiya qiladi.
 * Bular uzoq muddatli (10 yil) JWT'lar — Supabase'dagi anon/service key kabi.
 */
export async function generateProjectKeys(
  secret: string,
  ref: string,
): Promise<{ anonKey: string; serviceKey: string }> {
  const issuer = `storagedb/${ref}`;
  const [anonKey, serviceKey] = await Promise.all([
    signJwt(secret, "anon", { expiresIn: "10y", issuer }),
    signJwt(secret, "service_role", { expiresIn: "10y", issuer }),
  ]);
  return { anonKey, serviceKey };
}
