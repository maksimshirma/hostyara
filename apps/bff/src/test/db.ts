import { sql, type Kysely } from "kysely";
import type { PoolConfig } from "pg";
import { loadEnv } from "../config/env";
import type { Database } from "../db/schema";

export function testDatabaseConfig(): PoolConfig {
  const { postgres } = loadEnv();
  return { ...postgres, database: `${postgres.database}_test` };
}

export async function truncateAllTables(db: Kysely<Database>): Promise<void> {
  await sql`truncate table bff_sessions, login_challenges, app_backends`.execute(db);
}
