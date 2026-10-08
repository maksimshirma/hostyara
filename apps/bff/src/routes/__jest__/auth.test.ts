/** @jest-environment node */
import { Hono } from "hono";
import type { IdentityClient } from "../../identity/client";
import type { SessionEnv } from "../../session/middleware";
import {
  createFakeIdentity,
  createMemoryStore,
  sessionCookieFrom,
  setCookies,
} from "../../test/fakes";
import { registerAuthRoutes } from "../auth";

const USER = { id: "u_1", email: "a@example.com", name: "A" };
const IDENTITY_COOKIE = "better-auth.session_token=tok.sig";
const DAY_MS = 24 * 60 * 60 * 1000;
// Whole seconds: cookie Expires has second precision.
const EXPIRES_AT = new Date(Math.floor((Date.now() + 7 * DAY_MS) / 1000) * 1000);

function setup(identityOverrides: Parameters<typeof createFakeIdentity>[0] = {}) {
  const store = createMemoryStore();
  const identity: IdentityClient = createFakeIdentity({
    getSession: jest.fn(async (cookie: string) => ({
      kind: "ok" as const,
      data: { user: USER, expiresAt: EXPIRES_AT },
      cookie,
    })),
    ...identityOverrides,
  });
  const app = new Hono<SessionEnv>();
  registerAuthRoutes(app, { store, identity, trustProxy: true });
  return { app, store, identity };
}

function post(path: string, body: unknown, cookie?: string): RequestInit & { method: string } {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) {
    headers.Cookie = cookie;
  }
  return { method: "POST", headers, body: JSON.stringify(body) };
}

function expectNoIdentityCookieLeak(res: Response) {
  for (const header of setCookies(res)) {
    expect(header).not.toContain("better-auth");
    expect(header).not.toContain("tok.sig");
  }
}

describe("POST /auth/login", () => {
  it("creates a BFF session that mirrors the identity expiry", async () => {
    const { app, store } = setup({
      signIn: async () => ({ kind: "ok", data: USER, cookie: IDENTITY_COOKIE }),
    });

    const res = await app.request(
      "/auth/login",
      post("/auth/login", { email: USER.email, password: "pw" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: USER });
    const [header] = setCookies(res);
    expect(header).toMatch(/^__Host-session=sid-1;/);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain(`Expires=${EXPIRES_AT.toUTCString()}`);
    expectNoIdentityCookieLeak(res);
    const [session] = store.sessions.values();
    expect(session).toMatchObject({
      userId: "u_1",
      identityCookie: IDENTITY_COOKIE,
      expiresAt: EXPIRES_AT,
    });
  });

  it("passes the browser IP to identity-service", async () => {
    const signIn = jest.fn(async () => ({ kind: "unauthenticated" as const }));
    const { app } = setup({ signIn });

    await app.request("/auth/login", {
      ...post("/auth/login", { email: USER.email, password: "pw" }),
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "6.6.6.6, 203.0.113.7" },
    });

    expect(signIn).toHaveBeenCalledWith({ email: USER.email, password: "pw" }, "203.0.113.7");
  });

  it("answers 401 invalid_credentials without setting cookies", async () => {
    const { app, store } = setup({ signIn: async () => ({ kind: "unauthenticated" }) });

    const res = await app.request(
      "/auth/login",
      post("/auth/login", { email: USER.email, password: "bad" }),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_credentials" });
    expect(setCookies(res)).toEqual([]);
    expect(store.sessions.size).toBe(0);
  });

  it.each([
    [{ email: USER.email }],
    [{ email: "", password: "pw" }],
    [{ email: 1, password: "pw" }],
  ])("rejects malformed body %j with 400", async (body) => {
    const { app } = setup();

    const res = await app.request("/auth/login", post("/auth/login", body));

    expect(res.status).toBe(400);
  });

  it.each([
    ["timeout", 504, "upstream_timeout"],
    ["network", 502, "upstream_unavailable"],
  ] as const)("maps identity %s to %s", async (reason, status, error) => {
    const { app } = setup({ signIn: async () => ({ kind: "unavailable", reason }) });

    const res = await app.request(
      "/auth/login",
      post("/auth/login", { email: USER.email, password: "pw" }),
    );

    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error });
  });
});

describe("2FA", () => {
  const PENDING_COOKIE = "better-auth.two_factor=pending";

  function setupTwoFactor(verifyTotp: IdentityClient["verifyTotp"]) {
    return setup({
      signIn: async () => ({ kind: "two_factor_required", cookie: PENDING_COOKIE }),
      verifyTotp: jest.fn(verifyTotp),
    });
  }

  async function startLogin(app: Hono<SessionEnv>) {
    const res = await app.request(
      "/auth/login",
      post("/auth/login", { email: USER.email, password: "pw" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ twoFactor: true });
    expectNoIdentityCookieLeak(res);
    const header = setCookies(res).find((c) => c.startsWith("__Host-login="));
    expect(header).toContain("HttpOnly");
    return header!.split(";")[0];
  }

  it("completes login with a valid code and consumes the challenge", async () => {
    const { app, store, identity } = setupTwoFactor(async () => ({
      kind: "ok",
      data: USER,
      cookie: IDENTITY_COOKIE,
    }));
    const loginCookie = await startLogin(app);

    const res = await app.request(
      "/auth/2fa/verify",
      post("/auth/2fa/verify", { code: "123456" }, loginCookie),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: USER });
    expect(identity.verifyTotp).toHaveBeenCalledWith(PENDING_COOKIE, "123456", undefined);
    expect(setCookies(res).some((c) => /^__Host-login=;.*Max-Age=0/.test(c))).toBe(true);
    expect(sessionCookieFrom(res)).toBe("__Host-session=sid-2");
    expect(store.challenges.size).toBe(0);
    expectNoIdentityCookieLeak(res);
  });

  it("keeps the challenge after a wrong code so the user can retry", async () => {
    const { app, store } = setupTwoFactor(async () => ({ kind: "unauthenticated" }));
    const loginCookie = await startLogin(app);

    const res = await app.request(
      "/auth/2fa/verify",
      post("/auth/2fa/verify", { code: "000000" }, loginCookie),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_code" });
    expect(store.challenges.size).toBe(1);
    expect(store.sessions.size).toBe(0);
  });

  it("answers 401 without a pending challenge", async () => {
    const { app, identity } = setupTwoFactor(async () => ({
      kind: "ok",
      data: USER,
      cookie: IDENTITY_COOKIE,
    }));

    const res = await app.request(
      "/auth/2fa/verify",
      post("/auth/2fa/verify", { code: "123456" }, "__Host-login=forged"),
    );

    expect(res.status).toBe(401);
    expect(identity.verifyTotp).not.toHaveBeenCalled();
  });
});

describe("POST /auth/signup", () => {
  it("creates a session for a new account", async () => {
    const { app, store } = setup({
      signUp: async () => ({ kind: "ok", data: USER, cookie: IDENTITY_COOKIE }),
    });

    const res = await app.request(
      "/auth/signup",
      post("/auth/signup", { ...USER, password: "pw" }),
    );

    expect(res.status).toBe(200);
    expect(store.sessions.size).toBe(1);
  });

  it("passes identity's rejection code through", async () => {
    const { app } = setup({
      signUp: async () => ({
        kind: "rejected",
        status: 422,
        body: { code: "USER_ALREADY_EXISTS" },
      }),
    });

    const res = await app.request(
      "/auth/signup",
      post("/auth/signup", { ...USER, password: "pw" }),
    );

    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "rejected", code: "USER_ALREADY_EXISTS" });
  });
});

async function loggedIn(identityOverrides: Parameters<typeof createFakeIdentity>[0] = {}) {
  const ctx = setup({
    signIn: async () => ({ kind: "ok", data: USER, cookie: IDENTITY_COOKIE }),
    ...identityOverrides,
  });
  const res = await ctx.app.request(
    "/auth/login",
    post("/auth/login", { email: USER.email, password: "pw" }),
  );
  return { ...ctx, cookie: sessionCookieFrom(res) };
}

describe("POST /auth/logout", () => {
  it("signs out at identity-service and removes the BFF session", async () => {
    const signOut = jest.fn(async () => ({ kind: "ok" as const, data: null, cookie: "" }));
    const { app, store, cookie } = await loggedIn({ signOut });

    const res = await app.request("/auth/logout", post("/auth/logout", {}, cookie));

    expect(res.status).toBe(200);
    expect(signOut).toHaveBeenCalledWith(IDENTITY_COOKIE);
    expect(store.sessions.size).toBe(0);
    expect(setCookies(res).some((c) => /^__Host-session=;.*Max-Age=0/.test(c))).toBe(true);
  });

  it("removes the BFF session even when identity-service is down", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { app, store, cookie } = await loggedIn({
      signOut: async () => ({ kind: "unavailable", reason: "network" }),
    });

    const res = await app.request("/auth/logout", post("/auth/logout", {}, cookie));

    expect(res.status).toBe(200);
    expect(store.sessions.size).toBe(0);
  });

  it("is a no-op without a session", async () => {
    const { app } = setup();

    expect((await app.request("/auth/logout", post("/auth/logout", {}))).status).toBe(200);
  });
});

describe("GET /auth/me", () => {
  it("returns the user and slides the session to identity's new expiry", async () => {
    const later = new Date(EXPIRES_AT.getTime() + DAY_MS);
    const { app, store, identity, cookie } = await loggedIn();
    (identity.getSession as jest.Mock).mockResolvedValueOnce({
      kind: "ok",
      data: { user: USER, expiresAt: later },
      cookie: "better-auth.session_token=rotated",
    });

    const res = await app.request("/auth/me", { headers: { Cookie: cookie } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "u_1", user: USER });
    expect(sessionCookieFrom(res)).toBe(cookie);
    expect(setCookies(res)[0]).toContain(`Expires=${later.toUTCString()}`);
    const [session] = store.sessions.values();
    expect(session).toMatchObject({
      expiresAt: later,
      identityCookie: "better-auth.session_token=rotated",
    });
  });

  it("ends the BFF session when identity-service no longer knows it", async () => {
    const { app, store, identity, cookie } = await loggedIn();
    (identity.getSession as jest.Mock).mockResolvedValueOnce({ kind: "unauthenticated" });

    const res = await app.request("/auth/me", { headers: { Cookie: cookie } });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthenticated" });
    expect(store.sessions.size).toBe(0);
  });

  it("answers 401 without a session", async () => {
    const { app } = setup();

    expect((await app.request("/auth/me")).status).toBe(401);
  });
});
