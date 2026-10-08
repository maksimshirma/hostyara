import type { ColumnType, Generated } from "kysely";

interface BffSessionsTable {
  id_hash: string;
  identity_cookie_enc: string;
  user_id: string;
  expires_at: Date;
  created_at: Generated<Date>;
  synced_at: ColumnType<Date, Date | undefined, Date>;
  user_agent: string | null;
}

interface LoginChallengesTable {
  id_hash: string;
  identity_cookie_enc: string;
  expires_at: Date;
}

interface AppBackendsTable {
  app_id: string;
  base_url: string;
}

export interface Database {
  app_backends: AppBackendsTable;
  bff_sessions: BffSessionsTable;
  login_challenges: LoginChallengesTable;
}
