import type { Kysely } from "kysely";
import type { Database } from "../db/schema";
import { decryptSecret, encryptSecret, generateSessionId, hashSessionId } from "./crypto";

export interface ActiveSession {
  idHash: string;
  userId: string;
  // Raw `Cookie` header value for identity-service (name=value pairs).
  identityCookie: string;
  expiresAt: Date;
  syncedAt: Date;
}

export interface NewSession {
  identityCookie: string;
  userId: string;
  expiresAt: Date;
  userAgent: string | null;
}

export interface SessionStore {
  createSession(session: NewSession): Promise<{ id: string; idHash: string }>;
  findSession(id: string, now: Date): Promise<ActiveSession | null>;
  isSessionActive(idHash: string, now: Date): Promise<boolean>;
  // Records the identity session's current expiry (sliding window).
  markSynced(idHash: string, expiresAt: Date, now: Date): Promise<void>;
  updateIdentityCookie(idHash: string, identityCookie: string): Promise<void>;
  deleteSession(idHash: string): Promise<void>;
  createLoginChallenge(identityCookie: string, expiresAt: Date): Promise<string>;
  findLoginChallenge(id: string, now: Date): Promise<string | null>;
  deleteLoginChallenge(id: string): Promise<void>;
  deleteExpired(now: Date): Promise<void>;
}

export function createSessionStore(db: Kysely<Database>, key: Buffer): SessionStore {
  return {
    async createSession(session) {
      const id = generateSessionId();
      const idHash = hashSessionId(id);
      await db
        .insertInto("bff_sessions")
        .values({
          id_hash: idHash,
          identity_cookie_enc: encryptSecret(key, session.identityCookie),
          user_id: session.userId,
          expires_at: session.expiresAt,
          user_agent: session.userAgent,
        })
        .execute();
      return { id, idHash };
    },

    async findSession(id, now) {
      const row = await db
        .selectFrom("bff_sessions")
        .select(["id_hash", "identity_cookie_enc", "user_id", "expires_at", "synced_at"])
        .where("id_hash", "=", hashSessionId(id))
        .where("expires_at", ">", now)
        .executeTakeFirst();
      if (!row) {
        return null;
      }
      return {
        idHash: row.id_hash,
        userId: row.user_id,
        identityCookie: decryptSecret(key, row.identity_cookie_enc),
        expiresAt: row.expires_at,
        syncedAt: row.synced_at,
      };
    },

    async isSessionActive(idHash, now) {
      const row = await db
        .selectFrom("bff_sessions")
        .select("id_hash")
        .where("id_hash", "=", idHash)
        .where("expires_at", ">", now)
        .executeTakeFirst();
      return row !== undefined;
    },

    async markSynced(idHash, expiresAt, now) {
      await db
        .updateTable("bff_sessions")
        .set({ expires_at: expiresAt, synced_at: now })
        .where("id_hash", "=", idHash)
        .execute();
    },

    async updateIdentityCookie(idHash, identityCookie) {
      await db
        .updateTable("bff_sessions")
        .set({ identity_cookie_enc: encryptSecret(key, identityCookie) })
        .where("id_hash", "=", idHash)
        .execute();
    },

    async deleteSession(idHash) {
      await db.deleteFrom("bff_sessions").where("id_hash", "=", idHash).execute();
    },

    async createLoginChallenge(identityCookie, expiresAt) {
      const id = generateSessionId();
      await db
        .insertInto("login_challenges")
        .values({
          id_hash: hashSessionId(id),
          identity_cookie_enc: encryptSecret(key, identityCookie),
          expires_at: expiresAt,
        })
        .execute();
      return id;
    },

    async findLoginChallenge(id, now) {
      const row = await db
        .selectFrom("login_challenges")
        .select("identity_cookie_enc")
        .where("id_hash", "=", hashSessionId(id))
        .where("expires_at", ">", now)
        .executeTakeFirst();
      return row ? decryptSecret(key, row.identity_cookie_enc) : null;
    },

    async deleteLoginChallenge(id) {
      await db.deleteFrom("login_challenges").where("id_hash", "=", hashSessionId(id)).execute();
    },

    async deleteExpired(now) {
      await db.deleteFrom("bff_sessions").where("expires_at", "<=", now).execute();
      await db.deleteFrom("login_challenges").where("expires_at", "<=", now).execute();
    },
  };
}
