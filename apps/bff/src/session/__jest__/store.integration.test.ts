import { randomBytes } from "node:crypto";
import { sql } from "kysely";
import { createDatabase } from "../../db/kysely";
import { testDatabaseConfig, truncateAllTables } from "../../test/db";
import { hashSessionId } from "../crypto";
import { createSessionStore } from "../store";

const db = createDatabase(testDatabaseConfig());
const store = createSessionStore(db, randomBytes(32));

const NOW = new Date("2030-01-01T00:00:00Z");
const LATER = new Date("2030-01-08T00:00:00Z");
const IDENTITY_COOKIE = "better-auth.session_token=token.signature";

beforeEach(() => truncateAllTables(db));
afterAll(() => db.destroy());

function newSession(expiresAt = LATER) {
  return store.createSession({
    identityCookie: IDENTITY_COOKIE,
    userId: "u_1",
    expiresAt,
    userAgent: "jest",
  });
}

describe("sessions", () => {
  it("resolves a created session by its raw id", async () => {
    const { id, idHash } = await newSession();

    expect(await store.findSession(id, NOW)).toEqual({
      idHash,
      userId: "u_1",
      identityCookie: IDENTITY_COOKIE,
      expiresAt: LATER,
      syncedAt: expect.any(Date),
    });
  });

  it("stores only the id hash and the encrypted identity cookie", async () => {
    const { id } = await newSession();

    const rows = await sql<{
      row: string;
    }>`select row_to_json(s)::text as row from bff_sessions s`.execute(db);
    const dump = rows.rows[0].row;
    expect(dump).toContain(hashSessionId(id));
    expect(dump).not.toContain(id);
    expect(dump).not.toContain("token.signature");
  });

  it("does not resolve an unknown or expired session", async () => {
    const { id } = await newSession(NOW);

    expect(await store.findSession("unknown", NOW)).toBeNull();
    expect(await store.findSession(id, NOW)).toBeNull();
  });

  it("slides the expiry and records the sync time", async () => {
    const { id, idHash } = await newSession(NOW);
    await store.markSynced(idHash, LATER, NOW);

    const session = await store.findSession(id, NOW);
    expect(session?.expiresAt).toEqual(LATER);
    expect(session?.syncedAt).toEqual(NOW);
  });

  it("replaces the identity cookie", async () => {
    const { id, idHash } = await newSession();
    await store.updateIdentityCookie(idHash, "better-auth.session_token=rotated");

    expect((await store.findSession(id, NOW))?.identityCookie).toBe(
      "better-auth.session_token=rotated",
    );
  });

  it("reports whether a session is active by its hash", async () => {
    const { idHash } = await newSession();

    expect(await store.isSessionActive(idHash, NOW)).toBe(true);
    expect(await store.isSessionActive(idHash, LATER)).toBe(false);
    expect(await store.isSessionActive("missing", NOW)).toBe(false);
  });

  it("deletes a session", async () => {
    const { id, idHash } = await newSession();
    await store.deleteSession(idHash);

    expect(await store.findSession(id, NOW)).toBeNull();
  });
});

describe("login challenges", () => {
  it("can be read until deleted, so a mistyped code can be retried", async () => {
    const id = await store.createLoginChallenge(IDENTITY_COOKIE, LATER);

    expect(await store.findLoginChallenge(id, NOW)).toBe(IDENTITY_COOKIE);
    expect(await store.findLoginChallenge(id, NOW)).toBe(IDENTITY_COOKIE);
    await store.deleteLoginChallenge(id);
    expect(await store.findLoginChallenge(id, NOW)).toBeNull();
  });

  it("does not resolve an expired or unknown challenge", async () => {
    const id = await store.createLoginChallenge(IDENTITY_COOKIE, NOW);

    expect(await store.findLoginChallenge(id, NOW)).toBeNull();
    expect(await store.findLoginChallenge("unknown", NOW)).toBeNull();
  });
});

describe("deleteExpired", () => {
  it("removes only expired rows", async () => {
    await newSession(NOW);
    const live = await newSession(LATER);
    await store.createLoginChallenge(IDENTITY_COOKIE, NOW);

    await store.deleteExpired(NOW);

    const sessions = await db.selectFrom("bff_sessions").select("id_hash").execute();
    expect(sessions).toEqual([{ id_hash: live.idHash }]);
    expect(await db.selectFrom("login_challenges").selectAll().execute()).toHaveLength(0);
  });
});
