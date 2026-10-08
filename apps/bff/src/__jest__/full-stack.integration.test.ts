import { randomBytes } from "node:crypto";
import { createIntrospectionCache } from "../access/introspection-cache";
import { loadEnv } from "../config/env";
import { createDatabase } from "../db/kysely";
import { createAccessEventHub } from "../events/access-event-hub";
import { createIdentityClient } from "../identity/client";
import { createInternalApp, createPublicApp } from "../server";
import { createSessionStore } from "../session/store";
import { testDatabaseConfig, truncateAllTables } from "../test/db";
import { startFixtureBackend } from "../test/fixture-backend";
import { assertIdentityServiceUp, createIdentityDatabase, identityUrl } from "../test/identity-env";
import { createTestBrowser, type TestBrowser } from "../test/test-browser";
import { totp } from "../test/totp";

// BFF in-process + the real identity-service + a fixture sub-app backend
// that verifies internal JWTs through identity's JWKS. Covers the success
// metrics of cookie-session-transport.md, access.md and server-to-server.md.

const PASSWORD = "correct-horse-battery-staple";
const ORIGIN = new URL(loadEnv().publicUrl).origin;
const INTROSPECTION_TTL_MS = 300;
const run = `${Date.now()}${randomBytes(2).toString("hex")}`;

const db = createDatabase(testDatabaseConfig());
const identityDb = createIdentityDatabase();
const store = createSessionStore(db, randomBytes(32));
const introspectionCache = createIntrospectionCache({ ttlMs: INTROSPECTION_TTL_MS });
const accessEvents = createAccessEventHub();
const identity = createIdentityClient({ baseUrl: identityUrl(), origin: ORIGIN });
const allSetCookies: string[] = [];

let backend: Awaited<ReturnType<typeof startFixtureBackend>>;
let app: ReturnType<typeof createPublicApp>;
let internal: ReturnType<typeof createInternalApp>;

beforeAll(async () => {
  await assertIdentityServiceUp();
  await truncateAllTables(db);
  backend = await startFixtureBackend(identityUrl(), "recipes");
  const deps = {
    publicUrl: ORIGIN,
    trustProxy: true,
    pingDatabase: async () => {},
    store,
    identity,
    introspectionCache,
    accessEvents,
    findAppBackendUrl: async (appId: string) => (appId === "recipes" ? backend.url : null),
  };
  app = createPublicApp(deps);
  internal = createInternalApp(deps);
});

afterAll(async () => {
  await backend?.close();
  await identityDb.end();
  await db.destroy();
});

function browser(): TestBrowser {
  return createTestBrowser(app, ORIGIN, allSetCookies);
}

const email = (name: string) => `${name}-${run}@example.com`;

async function signUp(name: string): Promise<TestBrowser> {
  const b = browser();
  const res = await b.json("/auth/signup", {
    body: { name, email: email(name), password: PASSWORD },
  });
  expect(res.status).toBe(200);
  return b;
}

async function logIn(name: string): Promise<TestBrowser> {
  const b = browser();
  const res = await b.json("/auth/login", { body: { email: email(name), password: PASSWORD } });
  expect(res).toMatchObject({ status: 200, body: { user: { email: email(name) } } });
  return b;
}

async function createHousehold(owner: TestBrowser, name: string): Promise<string> {
  const res = await owner.json("/identity/api/auth/organization/create", {
    body: { name, slug: `${name.toLowerCase()}-${run}` },
  });
  expect(res.status).toBe(200);
  return res.body.id;
}

async function installApp(hid: string, appId: string) {
  await identityDb.query(`insert into installed_apps (hid, "appId") values ($1, $2)`, [hid, appId]);
}

async function addMember(
  owner: TestBrowser,
  hid: string,
  name: string,
): Promise<{ member: TestBrowser; memberId: string }> {
  const member = await signUp(name);
  const invite = await owner.json("/identity/api/auth/organization/invite-member", {
    body: { organizationId: hid, email: email(name), role: "member" },
  });
  expect(invite.status).toBe(200);
  const accept = await member.json("/identity/api/auth/organization/accept-invitation", {
    body: { invitationId: invite.body.id },
  });
  expect(accept.status).toBe(200);
  return { member, memberId: accept.body.member.id };
}

async function storedIdentityCookie(b: TestBrowser): Promise<string> {
  const session = await store.findSession(b.cookies.get("__Host-session")!, new Date());
  return session!.identityCookie;
}

describe("login → gateway → sub-app backend", () => {
  it("proxies with an internal JWT the backend verifies against identity's JWKS", async () => {
    const owner = await signUp("owner");
    const hid = await createHousehold(owner, "Home");
    await installApp(hid, "recipes");

    const res = await owner.json(`/api/h/${hid}/apps/recipes/items?q=soup`);

    expect(res.status).toBe(200);
    expect(res.body.path).toBe("/items?q=soup");
    expect(res.body.cookie).toBeNull();
    expect(res.body.claims).toMatchObject({ hid, aud: "recipes", scope: ["app:edit"] });
    expect(res.body.claims.exp - res.body.claims.iat).toBe(60);
  });

  it("separates not installed, no grant and not a member", async () => {
    const owner = await signUp("owner2");
    const hid = await createHousehold(owner, "Home2");
    await installApp(hid, "recipes");
    const { member } = await addMember(owner, hid, "member2");
    const stranger = await signUp("stranger2");

    expect((await owner.json(`/api/h/${hid}/apps/budget/x`)).body).toEqual({
      error: "not_installed",
    });
    expect(await member.json(`/api/h/${hid}/apps/recipes/x`)).toEqual({
      status: 403,
      body: { error: "no_grant" },
    });
    expect(await member.json(`/api/h/${hid}/access`)).toMatchObject({
      status: 200,
      body: { role: "member", installedApps: ["recipes"], grants: {} },
    });
    expect(await stranger.json(`/api/h/${hid}/access`)).toEqual({
      status: 403,
      body: { error: "forbidden" },
    });
    expect(await stranger.json(`/api/h/${hid}/apps/recipes/x`)).toEqual({
      status: 403,
      body: { error: "forbidden" },
    });
  });

  it("grants view access through a request the owner approves", async () => {
    const owner = await signUp("owner3");
    const hid = await createHousehold(owner, "Home3");
    await installApp(hid, "recipes");
    const { member } = await addMember(owner, hid, "member3");
    expect((await member.json(`/api/h/${hid}/apps/recipes/x`)).status).toBe(403);

    const request = await member.json("/identity/grant-requests", {
      body: { hid, appId: "recipes", requestedLevel: "view" },
    });
    expect(request.status).toBe(200);
    expect(
      (await owner.json(`/identity/grant-requests/${request.body.id}/approve`, { body: {} }))
        .status,
    ).toBe(200);
    // What identity's access.changed webhook does (its real delivery is
    // covered end to end in e2e-full): drop the member's cached access now.
    const memberUserId = (await member.json("/auth/me")).body.userId;
    await internal.request("/webhooks/access-changed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hid, userId: memberUserId, appId: "recipes" }),
    });

    const res = await member.json(`/api/h/${hid}/apps/recipes/x`);
    expect(res.status).toBe(200);
    expect(res.body.claims.scope).toEqual(["app:view"]);
  });
});

describe("2FA", () => {
  it("logs in through the TOTP step", async () => {
    const user = await signUp("twofa");
    const enable = await user.json("/identity/api/auth/two-factor/enable", {
      body: { password: PASSWORD },
    });
    expect(enable.status).toBe(200);
    const secret = new URL(enable.body.totpURI).searchParams.get("secret")!;
    expect(
      (
        await user.json("/identity/api/auth/two-factor/verify-totp", {
          body: { code: totp(secret) },
        })
      ).status,
    ).toBe(200);

    const b = browser();
    expect(
      await b.json("/auth/login", { body: { email: email("twofa"), password: PASSWORD } }),
    ).toEqual({
      status: 200,
      body: { twoFactor: true },
    });
    expect(b.cookies.has("__Host-login")).toBe(true);
    expect((await b.json("/auth/2fa/verify", { body: { code: "000000" } })).body).toEqual({
      error: "invalid_code",
    });

    const verified = await b.json("/auth/2fa/verify", { body: { code: totp(secret) } });

    expect(verified.status).toBe(200);
    expect(b.cookies.has("__Host-login")).toBe(false);
    expect((await b.json("/auth/me")).status).toBe(200);
  });
});

describe("revocation", () => {
  it("logout kills the identity session too", async () => {
    await signUp("leaver");
    const b = await logIn("leaver");
    const identityCookie = await storedIdentityCookie(b);

    expect((await b.json("/auth/logout", { body: {} })).status).toBe(200);

    const direct = await fetch(new URL("/introspect", identityUrl()), {
      headers: { Cookie: identityCookie },
    });
    expect(direct.status).toBe(401);
    expect((await b.json("/auth/me")).status).toBe(401);
  });

  it("a session revoked at identity-service is cut off on the next gateway call", async () => {
    const owner = await signUp("revoker");
    const hid = await createHousehold(owner, "Home4");
    await installApp(hid, "recipes");
    const otherDevice = await logIn("revoker");
    expect((await otherDevice.json(`/api/h/${hid}/apps/recipes/x`)).status).toBe(200);

    expect(
      (await owner.json("/identity/api/auth/revoke-other-sessions", { body: {} })).status,
    ).toBe(200);

    expect(await otherDevice.json(`/api/h/${hid}/apps/recipes/x`)).toEqual({
      status: 401,
      body: { error: "unauthenticated" },
    });
    expect((await otherDevice.json("/auth/me")).status).toBe(401);
    expect((await owner.json(`/api/h/${hid}/apps/recipes/x`)).status).toBe(200);
  });

  it("a removed member loses the app immediately and the household within the cache TTL", async () => {
    const owner = await signUp("owner5");
    const hid = await createHousehold(owner, "Home5");
    await installApp(hid, "recipes");
    const { member, memberId } = await addMember(owner, hid, "member5");
    const request = await member.json("/identity/grant-requests", {
      body: { hid, appId: "recipes", requestedLevel: "edit" },
    });
    await owner.json(`/identity/grant-requests/${request.body.id}/approve`, { body: {} });
    await new Promise((resolve) => setTimeout(resolve, INTROSPECTION_TTL_MS));
    expect((await member.json(`/api/h/${hid}/apps/recipes/x`)).status).toBe(200);

    expect(
      (await owner.json("/identity/account/security/reauth", { body: { password: PASSWORD } }))
        .status,
    ).toBe(200);
    const removed = await owner.json("/identity/api/auth/organization/remove-member", {
      body: { organizationId: hid, memberIdOrEmail: memberId },
    });
    expect(removed.status).toBe(200);

    // The cached introspection still says "member", but the token is refused.
    expect(await member.json(`/api/h/${hid}/apps/recipes/x`)).toEqual({
      status: 403,
      body: { error: "no_grant" },
    });
    await new Promise((resolve) => setTimeout(resolve, INTROSPECTION_TTL_MS));
    expect(await member.json(`/api/h/${hid}/access`)).toEqual({
      status: 403,
      body: { error: "forbidden" },
    });
  });
});

describe("sub-app backend token checks", () => {
  async function mintToken(): Promise<string> {
    const owner = await signUp("minter");
    const hid = await createHousehold(owner, "Home6");
    await installApp(hid, "recipes");
    const result = await identity.issueSessionToken(
      await storedIdentityCookie(owner),
      hid,
      "recipes",
    );
    if (result.kind !== "ok") throw new Error(`token not issued: ${result.kind}`);
    return result.data;
  }

  it("rejects a token issued for another app, an expired one and a forged one", async () => {
    const token = await mintToken();

    await expect(backend.verify(token, { audience: "recipes" })).resolves.toMatchObject({
      aud: "recipes",
    });
    await expect(backend.verify(token, { audience: "budget" })).rejects.toMatchObject({
      code: "ERR_JWT_CLAIM_VALIDATION_FAILED",
    });
    await expect(
      backend.verify(token, { audience: "recipes", currentDate: new Date(Date.now() + 61_000) }),
    ).rejects.toMatchObject({ code: "ERR_JWT_EXPIRED" });
    const [header, payload] = token.split(".");
    await expect(
      backend.verify(`${header}.${payload}.${"A".repeat(86)}`, { audience: "recipes" }),
    ).rejects.toMatchObject({
      code: "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
    });
  });

  it("is reachable only with a valid token, whoever calls it", async () => {
    const direct = await fetch(`${backend.url}/items`, {
      headers: { Authorization: "Internal not-a-jwt" },
    });

    expect(direct.status).toBe(401);
  });
});

describe("CSRF", () => {
  it("refuses cross-site requests before touching identity-service", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Sec-Fetch-Site": "cross-site", "Content-Type": "application/json" },
      body: JSON.stringify({ email: email("owner"), password: PASSWORD }),
    });

    expect(res.status).toBe(403);
  });
});

// Runs last: every Set-Cookie the simulated browsers received above.
describe("cookie transport", () => {
  it("never handed identity-service's own cookie to a browser", () => {
    expect(allSetCookies.length).toBeGreaterThan(0);
    for (const header of allSetCookies) {
      expect(header).toMatch(/^__Host-(session|login)=/);
      expect(header).not.toContain("better-auth");
    }
  });
});
