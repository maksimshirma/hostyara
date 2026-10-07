/** @jest-environment node */
import { Hono } from "hono";
import { TTL } from "../../config/ttl";
import { createFakeIdentity, createMemoryStore } from "../../test/fakes";
import { keepSessionAlive } from "../keep-alive";
import { requireSession, type SessionEnv } from "../middleware";

const USER = { id: "u_1", email: "a@example.com", name: "A" };

async function setup(syncedAgoMs: number, getSession: jest.Mock) {
  const store = createMemoryStore();
  const identity = createFakeIdentity({ getSession });
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const { id, idHash } = await store.createSession({
    identityCookie: "c=old",
    userId: "u_1",
    expiresAt,
    userAgent: null,
  });
  await store.markSynced(idHash, expiresAt, new Date(Date.now() - syncedAgoMs));

  const app = new Hono<SessionEnv>();
  app.use("*", requireSession(store), keepSessionAlive({ store, identity }));
  app.get("/ping", (c) => c.json({ cookie: c.get("session").identityCookie }));
  return { app, store, idHash, cookie: `__Host-session=${id}` };
}

describe("keepSessionAlive", () => {
  it("does not call identity-service for a recently synced session", async () => {
    const getSession = jest.fn();
    const { app, cookie } = await setup(1000, getSession);

    const res = await app.request("/ping", { headers: { Cookie: cookie } });

    expect(res.status).toBe(200);
    expect(getSession).not.toHaveBeenCalled();
  });

  it("re-syncs a stale session and hands the fresh cookie to the route", async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const getSession = jest.fn(async () => ({
      kind: "ok",
      data: { user: USER, expiresAt },
      cookie: "c=new",
    }));
    const { app, store, idHash, cookie } = await setup(TTL.sessionSyncMs, getSession);

    const res = await app.request("/ping", { headers: { Cookie: cookie } });

    expect(await res.json()).toEqual({ cookie: "c=new" });
    expect(getSession).toHaveBeenCalledWith("c=old");
    expect(store.sessions.get(idHash)).toMatchObject({ identityCookie: "c=new", expiresAt });
  });

  it("ends a session identity-service has revoked", async () => {
    const getSession = jest.fn(async () => ({ kind: "unauthenticated" }));
    const { app, store, cookie } = await setup(TTL.sessionSyncMs, getSession);

    const res = await app.request("/ping", { headers: { Cookie: cookie } });

    expect(res.status).toBe(401);
    expect(store.sessions.size).toBe(0);
  });

  it("keeps the user logged in while identity-service is unreachable", async () => {
    const getSession = jest.fn(async () => ({ kind: "unavailable", reason: "network" }));
    const { app, cookie } = await setup(TTL.sessionSyncMs, getSession);

    const res = await app.request("/ping", { headers: { Cookie: cookie } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cookie: "c=old" });
  });
});
