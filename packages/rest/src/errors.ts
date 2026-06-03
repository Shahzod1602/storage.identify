import { QueryError } from "@storagedb/sql-builder";

/** REST javobi sifatida qaytariladigan, statusi bor xato. */
export class RestHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "RestHttpError";
  }
}

// Postgres xato kodlari -> HTTP status.
const PG_STATUS: Record<string, number> = {
  "42501": 403, // insufficient_privilege (RLS/grant)
  "42P01": 404, // undefined_table
  "42703": 400, // undefined_column
  "23505": 409, // unique_violation
  "23503": 409, // foreign_key_violation
  "23502": 400, // not_null_violation
  "23514": 400, // check_violation
  "22P02": 400, // invalid_text_representation
};

interface PgError {
  code?: string;
  message?: string;
  detail?: string;
}

/** Ixtiyoriy xatoni REST HTTP xatosiga aylantiradi. */
export function toHttpError(err: unknown): RestHttpError {
  if (err instanceof RestHttpError) return err;
  if (err instanceof QueryError) return new RestHttpError(400, err.message);

  const pg = err as PgError;
  if (pg && typeof pg.code === "string") {
    const status = PG_STATUS[pg.code] ?? 400;
    return new RestHttpError(
      status,
      pg.detail ? `${pg.message} (${pg.detail})` : (pg.message ?? "DB xatosi"),
      pg.code,
    );
  }

  // Noma'lum xato -> 500.
  return new RestHttpError(
    500,
    err instanceof Error ? err.message : "Ichki xato",
  );
}
