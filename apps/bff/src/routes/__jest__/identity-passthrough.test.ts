/** @jest-environment node */
import { Hono } from "hono";
import type { IdentityCall, IdentityClient, IdentityResponse } from "../../identity/client";
import { requireSession, type SessionEnv } from "../../session/middleware";
import { createFakeIdentity, createMemoryStore, setCookies } from "../../test/fakes";
import { registerIdentityPassthrough } from "../identity-passthrough";

const USER = { id: "u_1", email: "a@example.com", name: "A" };

async function setup(
  respond: (call: IdentityCall) => IdentityResponse,
  overrides: Partial<IdentityClient> = {},
) {
  const store = createMemoryStore();
  const calls: IdentityCall[] = [];
  const identity = createFakeIdentity({
    getSession: jest.fn(async () => ({
      kind: "ok" as const,
      data: { user: USER, expiresAt: new Date(Date.now() + 60_000) },
      cookie: "c=1",
    })),
    ...overrides,
  });
  identity.send = async (call) => {
    calls.push(call);
    return respond(call);
  };
  const { id } = await store.createSession({
    identityCookie: "c=1",
    userId: "u_1",
    expiresAt: new Date(Date.now() + 60_000),
    userAgent: null,
  });
  const app = new Hono<SessionEnv>();
  app.use("/identity/*", requireSession(store));
  registerIdentityPassthrough(app, { store, identity, trustProxy: true });
  const call = (path: string, init: RequestInit = {}) =>
    app.request(path, { ...init, headers: { Cookie: `__Host-session=${id}`, ...init.headers } });
  return { call, calls, store, identity };
}

function identityResponse(
  body: unknown,
  status = 200,
  setCookie: string[] = [],
  cookie = "c=1",
): IdentityResponse {
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const value of setCookie) {
    headers.append("Set-Cookie", value);
  }
  return { ok: true, response: new Response(JSON.stringify(body), { status, headers }), cookie };
}

describe("/identity/* passthrough", () => {
  it("forwards an allowed call with the stored cookie, body, query and client IP", async () => {
    const { call, calls } = await setup(() => identityResponse({ id: "h1" }));

    const res = await call("/identity/api/auth/organization/create?x=1", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.7" },
      body: JSON.stringify({ name: "Home", slug: "home" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "h1" });
    const [forwarded] = calls;
    expect(forwarded).toMatchObject({
      method: "POST",
      path: "/api/auth/organization/create?x=1",
      cookie: "c=1",
      contentType: "application/json",
      clientIp: "203.0.113.7",
    });
    expect(JSON.parse(Buffer.from(forwarded.body as ArrayBuffer).toString())).toEqual({
      name: "Home",
      slug: "home",
    });
  });

  it("refuses paths outside the allowlist without calling identity-service", async () => {
    const { call, calls } = await setup(() => identityResponse({}));

    const res = await call("/identity/introspect/household?hid=h1");

    expect(res.status).toBe(404);
    expect(calls).toHaveLength(0);
  });

  it("keeps identity cookies away from the browser and stores the rotated one", async () => {
    const { call, store } = await setup(() =>
      identityResponse(
        { ok: true },
        200,
        ["better-auth.session_token=rotated; HttpOnly"],
        "better-auth.session_token=rotated",
      ),
    );

    const res = await call("/identity/api/auth/list-sessions");

    expect(setCookies(res)).toEqual([]);
    expect([...store.sessions.values()][0].identityCookie).toBe(
      "better-auth.session_token=rotated",
    );
  });

  it("passes a call-level 401 through when the identity session is still alive", async () => {
    const { call, store } = await setup(() => identityResponse({ code: "INVALID_PASSWORD" }, 401));

    const res = await call("/identity/account/security/reauth", { method: "POST", body: "{}" });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ code: "INVALID_PASSWORD" });
    expect(store.sessions.size).toBe(1);
  });

  it("ends the BFF session when the identity session is gone", async () => {
    const { call, store } = await setup(() => identityResponse({}, 401), {
      getSession: async () => ({ kind: "unauthenticated" }),
    });

    const res = await call("/identity/api/auth/list-sessions");

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthenticated" });
    expect(store.sessions.size).toBe(0);
  });

  it("maps an unreachable identity-service to 502", async () => {
    const { call } = await setup(() => ({ ok: false, reason: "network" }));

    expect((await call("/identity/api/auth/list-sessions")).status).toBe(502);
  });
});
