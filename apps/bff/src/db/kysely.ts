import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool, type PoolConfig } from "pg";
import type { Database } from "./schema";

export function createDatabase(config: PoolConfig): Kysely<Database> {
  const pool = new Pool(config);
  // An idle client losing its connection (DB restart, failover) emits
  // 'error' on the pool; unhandled, that crashes the whole process. The pool
  // discards the broken client itself — the next query reconnects.
  pool.on("error", (err) => {
    console.error("[db] idle client error", err.message);
  });
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}

export async function pingDatabase(db: Kysely<Database>): Promise<void> {
  await sql`select 1`.execute(db);
}
