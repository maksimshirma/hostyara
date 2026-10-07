import type { IdentityClient } from "../identity/client";
import { hashSessionId } from "../session/crypto";
import type { ActiveSession, SessionStore } from "../session/store";

// In-memory stand-in for the Postgres store in route unit tests; the real
// store is covered by store.integration.test.ts.
export function createMemoryStore(): SessionStore & {
  sessions: Map<string, ActiveSession>;
  challenges: Map<string, { cookie: string; expiresAt: Date }>;
} {
  const sessions = new Map<string, ActiveSession>();
  const challenges = new Map<string, { cookie: string; expiresAt: Date }>();
  let counter = 0;
  return {
    sessions,
    challenges,
    async createSession(session) {
      const id = `sid-${++counter}`;
      const idHash = hashSessionId(id);
      sessions.set(idHash, {
        idHash,
        userId: session.userId,
        identityCookie: session.identityCookie,
        expiresAt: session.expiresAt,
        syncedAt: new Date(),
      });
      return { id, idHash };
    },
    async findSession(id, now) {
      const session = sessions.get(hashSessionId(id));
      return session && session.expiresAt > now ? { ...session } : null;
    },
    async isSessionActive(idHash, now) {
      const session = sessions.get(idHash);
      return session !== undefined && session.expiresAt > now;
    },
    async markSynced(idHash, expiresAt, now) {
      const session = sessions.get(idHash);
      if (session) {
        sessions.set(idHash, { ...session, expiresAt, syncedAt: now });
      }
    },
    async updateIdentityCookie(idHash, identityCookie) {
      const session = sessions.get(idHash);
      if (session) {
        sessions.set(idHash, { ...session, identityCookie });
      }
    },
    async deleteSession(idHash) {
      sessions.delete(idHash);
    },
    async createLoginChallenge(cookie, expiresAt) {
      const id = `challenge-${++counter}`;
      challenges.set(id, { cookie, expiresAt });
      return id;
    },
    async findLoginChallenge(id, now) {
      const challenge = challenges.get(id);
      return challenge && challenge.expiresAt > now ? challenge.cookie : null;
    },
    async deleteLoginChallenge(id) {
      challenges.delete(id);
    },
    async deleteExpired() {},
  };
}

type IdentityMethods = Omit<IdentityClient, "send">;

export function createFakeIdentity(overrides: Partial<IdentityMethods> = {}): IdentityClient {
  const notStubbed = (name: string) => async () => {
    throw new Error(`identity.${name} not stubbed`);
  };
  return {
    send: notStubbed("send"),
    signUp: notStubbed("signUp"),
    signIn: notStubbed("signIn"),
    verifyTotp: notStubbed("verifyTotp"),
    signOut: notStubbed("signOut"),
    getSession: notStubbed("getSession"),
    introspectHousehold: notStubbed("introspectHousehold"),
    issueSessionToken: notStubbed("issueSessionToken"),
    ...overrides,
  } as IdentityClient;
}

export function setCookies(res: Response): string[] {
  return res.headers.getSetCookie();
}

export function sessionCookieFrom(res: Response): string {
  const header = setCookies(res).find((c) => c.startsWith("__Host-session="));
  if (!header) {
    throw new Error("no __Host-session cookie set");
  }
  return header.split(";")[0];
}
