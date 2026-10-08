import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("bff_sessions")
    .addColumn("id_hash", "text", (col) => col.primaryKey())
    .addColumn("identity_cookie_enc", "text", (col) => col.notNull())
    .addColumn("user_id", "text", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    // Last time expiry and identity cookie were re-read from identity-service.
    .addColumn("synced_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("user_agent", "text")
    .execute();
  await db.schema
    .createIndex("bff_sessions_expires_at_idx")
    .on("bff_sessions")
    .column("expires_at")
    .execute();
  await db.schema
    .createIndex("bff_sessions_user_id_idx")
    .on("bff_sessions")
    .column("user_id")
    .execute();

  await db.schema
    .createTable("login_challenges")
    .addColumn("id_hash", "text", (col) => col.primaryKey())
    .addColumn("identity_cookie_enc", "text", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("login_challenges").execute();
  await db.schema.dropTable("bff_sessions").execute();
}
