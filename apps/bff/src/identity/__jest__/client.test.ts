/** @jest-environment node */
import { createIdentityClient } from "../client";

const BASE_URL = "http://identity.test";
const ORIGIN = "http://shell.test";
const USER = { id: "u_1", email: "a@example.com", name: "A" };

type Handler = (request: Request) => Response | Promise<Response>;

function setup(handler: Handler) {
  const requests: Request[] = [];
  const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push(request);
    return handler(request);
  }) as typeof fetch;
  return {
    client: createIdentityClient({ baseUrl: BASE_URL, origin: ORIGIN, fetch: fakeFetch }),
    requests,
  };
}

function json(body: unknown, init: ResponseInit & { setCookie?: string[] } = {}): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  for (const cookie of init.setCookie ?? []) {
    headers.append("Set-Cookie", cookie);
  }
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers });
}

describe("signIn", () => {
  it("returns the user and the captured identity cookie", async () => {
    const { client, requests } = setup(() =>
      json({ user: USER }, { setCookie: ["better-auth.session_token=tok.sig; Path=/; HttpOnly"] }),
    );

    const result = await client.signIn({ email: USER.email, password: "pw" });

    expect(result).toEqual({ kind: "ok", data: USER, cookie: "better-auth.session_token=tok.sig" });
    const [request] = requests;
    expect(request.url).toBe(`${BASE_URL}/api/auth/sign-in/email`);
    expect(request.method).toBe("POST");
    expect(request.headers.get("Origin")).toBe(ORIGIN);
    expect(request.headers.get("Cookie")).toBeNull();
    expect(await request.json()).toEqual({ email: USER.email, password: "pw" });
  });

  it("forwards the end user's IP for Better-Auth rate limiting", async () => {
    const { client, requests } = setup(() => json({ user: USER }));

    await client.signIn({ email: USER.email, password: "pw" }, "203.0.113.7");

    expect(requests[0].headers.get("X-Forwarded-For")).toBe("203.0.113.7");
  });

  it("reports a pending 2FA step with the temporary cookie", async () => {
    const { client } = setup(() =>
      json(
        { twoFactorRedirect: true },
        { setCookie: ["better-auth.two_factor=pending; Max-Age=600"] },
      ),
    );

    expect(await client.signIn({ email: USER.email, password: "pw" })).toEqual({
      kind: "two_factor_required",
      cookie: "better-auth.two_factor=pending",
    });
  });

  it("maps wrong credentials to unauthenticated", async () => {
    const { client } = setup(() => json({ code: "INVALID_EMAIL_OR_PASSWORD" }, { status: 401 }));

    expect(await client.signIn({ email: USER.email, password: "bad" })).toEqual({
      kind: "unauthenticated",
    });
  });
});

describe("verifyTotp", () => {
  it("sends the pending cookie and swaps it for the session cookie", async () => {
    const { client, requests } = setup(() =>
      json(
        { user: USER },
        {
          setCookie: [
            "better-auth.two_factor=; Max-Age=0",
            "better-auth.session_token=tok.sig; Path=/",
          ],
        },
      ),
    );

    const result = await client.verifyTotp("better-auth.two_factor=pending", "123456");

    expect(result).toEqual({ kind: "ok", data: USER, cookie: "better-auth.session_token=tok.sig" });
    expect(requests[0].headers.get("Cookie")).toBe("better-auth.two_factor=pending");
    expect(await requests[0].json()).toEqual({ code: "123456" });
  });
});

describe("getSession", () => {
  it("returns the user and identity expiry", async () => {
    const { client, requests } = setup(() =>
      json({ user: USER, session: { expiresAt: "2030-01-08T00:00:00.000Z" } }),
    );

    const result = await client.getSession("better-auth.session_token=tok.sig");

    expect(result).toEqual({
      kind: "ok",
      data: { user: USER, expiresAt: new Date("2030-01-08T00:00:00.000Z") },
      cookie: "better-auth.session_token=tok.sig",
    });
    expect(requests[0].method).toBe("GET");
    expect(requests[0].headers.get("Cookie")).toBe("better-auth.session_token=tok.sig");
  });

  it("treats Better-Auth's 200 null as unauthenticated", async () => {
    const { client } = setup(() => json(null));

    expect(await client.getSession("better-auth.session_token=gone")).toEqual({
      kind: "unauthenticated",
    });
  });
});

describe("introspectHousehold", () => {
  const INTROSPECTION = {
    userId: "u_1",
    hid: "h 1",
    role: "member",
    installedApps: ["recipes"],
    grants: { recipes: "edit" },
    permissions: { recipes: ["storage.own"] },
  };

  it("returns the introspection and encodes hid", async () => {
    const { client, requests } = setup(() => json(INTROSPECTION));

    const result = await client.introspectHousehold("c=1", "h 1");

    expect(result).toEqual({ kind: "ok", data: INTROSPECTION, cookie: "c=1" });
    expect(requests[0].url).toBe(`${BASE_URL}/introspect/household?hid=h%201`);
  });

  it.each([
    [401, { kind: "unauthenticated" }],
    [403, { kind: "forbidden" }],
    [503, { kind: "unavailable", reason: "server_error" }],
    [400, { kind: "rejected", status: 400, body: { error: "bad_request" } }],
  ])("maps HTTP %s", async (status, expected) => {
    const { client } = setup(() => json({ error: "bad_request" }, { status }));

    expect(await client.introspectHousehold("c=1", "h1")).toEqual(expected);
  });
});

describe("issueSessionToken", () => {
  it("posts hid/appId and returns the token", async () => {
    const { client, requests } = setup(() => json({ token: "jwt" }));

    expect(await client.issueSessionToken("c=1", "h1", "recipes")).toEqual({
      kind: "ok",
      data: "jwt",
      cookie: "c=1",
    });
    expect(requests[0].url).toBe(`${BASE_URL}/token?grant_type=session`);
    expect(await requests[0].json()).toEqual({ hid: "h1", appId: "recipes" });
  });
});

describe("signOut", () => {
  it("returns the cleared cookie", async () => {
    const { client } = setup(() =>
      json({ success: true }, { setCookie: ["better-auth.session_token=; Max-Age=0"] }),
    );

    expect(await client.signOut("better-auth.session_token=tok.sig")).toEqual({
      kind: "ok",
      data: null,
      cookie: "",
    });
  });
});

describe("transport failures", () => {
  it("reports network errors as unavailable", async () => {
    const { client } = setup(() => {
      throw new TypeError("fetch failed");
    });

    expect(await client.getSession("c=1")).toEqual({ kind: "unavailable", reason: "network" });
  });

  it("reports timeouts as unavailable", async () => {
    const { client } = setup(() => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    });

    expect(await client.introspectHousehold("c=1", "h1")).toEqual({
      kind: "unavailable",
      reason: "timeout",
    });
  });
});
