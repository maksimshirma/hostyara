/** @jest-environment node */
import { Hono } from "hono";
import { createIntrospectionCache } from "../../access/introspection-cache";
import type { IdentityClient } from "../../identity/client";
import type { HouseholdIntrospection } from "../../identity/types";
import { requireSession, type SessionEnv } from "../../session/middleware";
import { createFakeIdentity, createMemoryStore } from "../../test/fakes";
import { registerGatewayRoutes } from "../gateway";

const INTROSPECTION: HouseholdIntrospection = {
  userId: "u_1",
  hid: "h1",
  role: "member",
  installedApps: ["recipes", "budget"],
  grants: { recipes: "edit" },
  permissions: {},
};

interface SetupOptions {
  identity?: Partial<Omit<IdentityClient, "send">>;
  backend?: (request: Request) => Response | Promise<Response>;
  backends?: Record<string, string>;
}

async function setup(options: SetupOptions = {}) {
  const store = createMemoryStore();
  const introspectionCache = createIntrospectionCache({ ttlMs: 30_000 });
  const identity = createFakeIdentity({
    introspectHousehold: jest.fn(async () => ({
      kind: "ok" as const,
      data: INTROSPECTION,
      cookie: "c=1",
    })),
    issueSessionToken: jest.fn(async () => ({ kind: "ok" as const, data: "jwt-1", cookie: "c=1" })),
    ...options.identity,
  });
  const upstreamRequests: Request[] = [];
  const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    upstreamRequests.push(request);
    return (options.backend ?? (() => Response.json({ ok: true })))(request);
  }) as typeof fetch;
  const backends = options.backends ?? { recipes: "http://recipes.internal/v1" };

  const { id } = await store.createSession({
    identityCookie: "c=1",
    userId: "u_1",
    expiresAt: new Date(Date.now() + 60_000),
    userAgent: null,
  });
  const app = new Hono<SessionEnv>();
  app.use("/api/*", requireSession(store));
  registerGatewayRoutes(app, {
    store,
    identity,
    introspectionCache,
    findAppBackendUrl: async (appId) => backends[appId] ?? null,
    fetch: fakeFetch,
  });
  const call = (path: string, init: RequestInit = {}) =>
    app.request(path, { ...init, headers: { Cookie: `__Host-session=${id}`, ...init.headers } });
  return { call, identity, store, upstreamRequests, introspectionCache };
}

describe("gateway", () => {
  it("proxies to the backend with a fresh internal JWT and without browser credentials", async () => {
    const { call, identity, upstreamRequests } = await setup();

    const res = await call("/api/h/h1/apps/recipes/items/42?full=1", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer forged" },
      body: JSON.stringify({ title: "Soup" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Hostyara-Upstream")).toBe("app");
    expect(await res.json()).toEqual({ ok: true });
    expect(identity.issueSessionToken).toHaveBeenCalledWith("c=1", "h1", "recipes");
    const [upstream] = upstreamRequests;
    expect(upstream.url).toBe("http://recipes.internal/v1/items/42?full=1");
    expect(upstream.method).toBe("PUT");
    expect(upstream.headers.get("Authorization")).toBe("Internal jwt-1");
    expect(upstream.headers.get("Cookie")).toBeNull();
    expect(await upstream.json()).toEqual({ title: "Soup" });
  });

  it("requests a new token on every call but introspects once per TTL", async () => {
    const { call, identity } = await setup();

    await call("/api/h/h1/apps/recipes/a");
    await call("/api/h/h1/apps/recipes/b");

    expect(identity.issueSessionToken).toHaveBeenCalledTimes(2);
    expect(identity.introspectHousehold).toHaveBeenCalledTimes(1);
  });

  it("proxies the app root", async () => {
    const { call, upstreamRequests } = await setup();

    expect((await call("/api/h/h1/apps/recipes")).status).toBe(200);
    expect(upstreamRequests[0].url).toBe("http://recipes.internal/v1/");
  });

  it("passes backend status and body through, minus cookies", async () => {
    const { call } = await setup({
      backend: () =>
        new Response("missing", {
          status: 404,
          headers: { "Set-Cookie": "evil=1", "Content-Type": "text/plain" },
        }),
    });

    const res = await call("/api/h/h1/apps/recipes/nope");

    expect(res.status).toBe(404);
    expect(await res.text()).toBe("missing");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("answers 404 not_installed without asking for a token", async () => {
    const { call, identity, upstreamRequests } = await setup();

    const res = await call("/api/h/h1/apps/tasks/x");

    expect(res.status).toBe(404);
    expect(res.headers.get("X-Hostyara-Upstream")).toBeNull();
    expect(await res.json()).toEqual({ error: "not_installed" });
    expect(identity.issueSessionToken).not.toHaveBeenCalled();
    expect(upstreamRequests).toHaveLength(0);
  });

  it("answers 403 no_grant for an installed app without a grant", async () => {
    const { call, upstreamRequests } = await setup();

    const res = await call("/api/h/h1/apps/budget/x");

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "no_grant" });
    expect(upstreamRequests).toHaveLength(0);
  });

  it("answers 403 forbidden for a household the user is not in", async () => {
    const { call } = await setup({
      identity: { introspectHousehold: async () => ({ kind: "forbidden" }) },
    });

    const res = await call("/api/h/other/apps/recipes/x");

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("drops the cached introspection when identity refuses the token", async () => {
    const { call, introspectionCache, upstreamRequests } = await setup({
      identity: { issueSessionToken: async () => ({ kind: "forbidden" }) },
    });

    const res = await call("/api/h/h1/apps/recipes/x");

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "no_grant" });
    expect(introspectionCache.size).toBe(0);
    expect(upstreamRequests).toHaveLength(0);
  });

  it("ends the session when identity says it is gone", async () => {
    const { call, store } = await setup({
      identity: { issueSessionToken: async () => ({ kind: "unauthenticated" }) },
    });

    expect((await call("/api/h/h1/apps/recipes/x")).status).toBe(401);
    expect(store.sessions.size).toBe(0);
  });

  it("rejects encoded traversal the URL parser leaves in place", async () => {
    const { call, upstreamRequests } = await setup();

    const res = await call("/api/h/h1/apps/recipes/a/..%2f..%2fadmin");

    expect(res.status).toBe(400);
    expect(upstreamRequests).toHaveLength(0);
  });

  it("never lets a normalized traversal reach another backend path", async () => {
    const { call, upstreamRequests } = await setup();

    // The URL parser resolves %2e%2e first, so this addresses appId "admin".
    const res = await call("/api/h/h1/apps/recipes/%2e%2e/admin");

    expect(res.status).toBe(404);
    expect(upstreamRequests).toHaveLength(0);
  });

  it("answers 502 when the installed app has no registered backend", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { call } = await setup({ backends: {} });

    const res = await call("/api/h/h1/apps/recipes/x");

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "upstream_unavailable" });
  });

  it.each([
    ["TimeoutError", 504, "upstream_timeout"],
    ["TypeError", 502, "upstream_unavailable"],
  ])("maps a backend %s to %s", async (name, status, error) => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { call } = await setup({
      backend: () => {
        throw Object.assign(new Error("boom"), { name });
      },
    });

    const res = await call("/api/h/h1/apps/recipes/x");

    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error });
  });

  it("refuses oversized bodies", async () => {
    const { call, upstreamRequests } = await setup();

    const res = await call("/api/h/h1/apps/recipes/upload", {
      method: "POST",
      headers: { "Content-Length": String(11 * 1024 * 1024) },
      body: "x",
    });

    expect(res.status).toBe(413);
    expect(upstreamRequests).toHaveLength(0);
  });
});
