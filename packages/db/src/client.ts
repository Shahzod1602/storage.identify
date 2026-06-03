import postgres from "postgres";
import { getConfig } from "@storagedb/config";

export type Sql = postgres.Sql;

let platformSql: Sql | null = null;

/**
 * Control-plane (platform) database ulanishi.
 * Loyihalar, kalitlar va metama'lumotlar shu yerda saqlanadi.
 */
export function platform(): Sql {
  if (!platformSql) {
    platformSql = postgres(getConfig().DATABASE_URL, {
      max: 10,
      onnotice: () => {}, // NOTICE'larni jim qilamiz
    });
  }
  return platformSql;
}

/**
 * Berilgan URL uchun yangi (vaqtinchalik) ulanish ochadi.
 * Provisioner DDL (CREATE DATABASE / CREATE ROLE) uchun ishlatadi.
 * Foydalangach `.end()` chaqirilishi shart.
 */
export function connect(url: string, opts: postgres.Options<{}> = {}): Sql {
  return postgres(url, { max: 1, onnotice: () => {}, ...opts });
}

/** Barcha ulanishlarni yopadi (graceful shutdown). */
export async function closeAll(): Promise<void> {
  if (platformSql) {
    await platformSql.end({ timeout: 5 });
    platformSql = null;
  }
}
