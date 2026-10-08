import type { Kysely } from "kysely";
import { Migrator } from "kysely/migration";
import { migrations } from "./migrations";
import type { Database } from "./schema";

export async function migrateToLatest(db: Kysely<Database>): Promise<void> {
  const migrator = new Migrator({ db, provider: { getMigrations: async () => migrations } });
  const { error, results } = await migrator.migrateToLatest();
  for (const result of results ?? []) {
    console.log(`${result.status}: ${result.migrationName}`);
  }
  if (error) {
    throw error;
  }
}
