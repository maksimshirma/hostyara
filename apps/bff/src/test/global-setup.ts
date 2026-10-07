import { Client } from "pg";
import { loadEnv } from "../config/env";
import { createDatabase } from "../db/kysely";
import { migrateToLatest } from "../db/migrator";
import { testDatabaseConfig } from "./db";

// Recreates <POSTGRES_DB>_test from scratch on every run.
export default async function globalSetup(): Promise<void> {
  const testConfig = testDatabaseConfig();
  const admin = new Client(loadEnv().postgres);
  await admin.connect();
  await admin.query(`drop database if exists "${testConfig.database}" with (force)`);
  await admin.query(`create database "${testConfig.database}"`);
  await admin.end();

  const db = createDatabase(testConfig);
  const log = console.log;
  console.log = () => {};
  try {
    await migrateToLatest(db);
  } finally {
    console.log = log;
    await db.destroy();
  }
}
