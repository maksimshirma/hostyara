import type { Kysely } from "kysely";
import type { Database } from "../db/schema";

export async function findAppBackendUrl(
  db: Kysely<Database>,
  appId: string,
): Promise<string | null> {
  const row = await db
    .selectFrom("app_backends")
    .select("base_url")
    .where("app_id", "=", appId)
    .executeTakeFirst();
  return row?.base_url ?? null;
}
