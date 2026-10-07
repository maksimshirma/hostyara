import type { Kysely } from "kysely";

// Sub-app backends the gateway may proxy to, one row per appId. Added by hand
// when a sub-app backend is deployed (bff-placement.md п.4).
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("app_backends")
    .addColumn("app_id", "text", (col) => col.primaryKey())
    .addColumn("base_url", "text", (col) => col.notNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("app_backends").execute();
}
