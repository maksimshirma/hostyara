import { loadEnv } from "../config/env";
import { createDatabase } from "./kysely";
import { migrateToLatest } from "./migrator";

async function run(): Promise<void> {
  const db = createDatabase(loadEnv().postgres);
  try {
    await migrateToLatest(db);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

void run();
