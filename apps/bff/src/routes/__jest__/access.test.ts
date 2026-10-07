/** @jest-environment node */
import { Hono } from "hono";
import { createIntrospectionCache } from "../../access/introspection-cache";
import type { HouseholdIntrospection } from "../../identity/types";
import { requireSession, type SessionEnv } from "../../session/middleware";
import { createFakeIdentity, createMemoryStore } from "../../test/fakes";
import { registerAccessRoutes } from "../access";

const INTROSPECTION: HouseholdIntrospection = {
  userId: "u_1",
  hid: "h1",
  role: "member",
  installedApps: ["recipes", "budget"],
  grants: { recipes: "edit" },
  permissions: { recipes: ["storage.own"] },
};

async function setup(introspectHousehold: jest.Mock) {
  const store = createMemoryStore();
  const identity = createFakeIdentity({ introspectHousehold });
  const introspectionCache = createIntrospectionCache({ ttlMs: 30_000 });
  const { id } = await store.createSession({
    identityCookie: "c=1",
    userId: "u_1",
    expiresAt: new Date(Date.now() + 60_000),
    userAgent: null,
  });
  const app = new Hono<SessionEnv>();
  app.use("/api/*", requireSession(store));
  registerAccessRoutes(app, { store, identity, introspectionCache });
  const get = (hid = "h1") =>
    app.request(`/api/h/${hid}/access`, { headers: { Cookie: `__Host-session=${id}` } });
  return { get, store, introspectionCache };
}

describe("GET /api/h/:hid/access", () => {
  it("returns role, apps, grants and permissions, then serves repeats from cache", async () => {
    const introspect = jest.fn(async () => ({ kind: "ok", data: INTROSPECTION, cookie: "c=1" }));
    const { get } = await setup(introspect);

    const first = await get();
    const second = await get();

    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({
      role: "member",
      installedApps: ["recipes", "budget"],
      grants: { recipes: "edit" },
      permissions: { recipes: ["storage.own"] },
    });
    expect(second.status).toBe(200);
    expect(introspect).toHaveBeenCalledTimes(1);
    expect(introspect).toHaveBeenCalledWith("c=1", "h1");
  });

  it("refetches after the entry is invalidated", async () => {
    const introspect = jest.fn(async () => ({ kind: "ok", data: INTROSPECTION, cookie: "c=1" }));
    const { get, introspectionCache } = await setup(introspect);

    await get();
    introspectionCache.invalidate({ hid: "h1", userId: "u_1" });
    await get();

    expect(introspect).toHaveBeenCalledTimes(2);
  });

  it("answers 403 forbidden for a household the user is not a member of, without caching", async () => {
    const introspect = jest.fn(async () => ({ kind: "forbidden" }));
    const { get, introspectionCache } = await setup(introspect);

    const res = await get("other");

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
    expect(introspectionCache.size).toBe(0);
  });

  it("ends the BFF session on 401 from identity-service", async () => {
    const { get, store } = await setup(jest.fn(async () => ({ kind: "unauthenticated" })));

    const res = await get();

    expect(res.status).toBe(401);
    expect(store.sessions.size).toBe(0);
  });

  it("persists a rotated identity cookie", async () => {
    const { get, store } = await setup(
      jest.fn(async () => ({ kind: "ok", data: INTROSPECTION, cookie: "c=2" })),
    );

    await get();

    expect([...store.sessions.values()][0].identityCookie).toBe("c=2");
  });
});
