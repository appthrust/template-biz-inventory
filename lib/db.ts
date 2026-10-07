import { Pool } from "pg";

let pool: Pool | undefined;

/** Migrations are applied by AppThrust DatabaseChange, never by web requests. */
export function getDatabase(): Pool {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  pool ??= new Pool({
    connectionString,
    max: 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  return pool;
}
