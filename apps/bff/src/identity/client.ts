import { TTL } from "../config/ttl";
import { applySetCookies } from "./cookie-jar";
import type {
  AuthenticationResult,
  HouseholdIntrospection,
  IdentityResult,
  IdentitySession,
  IdentityUser,
} from "./types";

export interface IdentityClientOptions {
  baseUrl: string;
  // The BFF's public origin. Better-Auth checks Origin on cookie-authenticated
  // POSTs, and identity-service lists this origin in TRUSTED_ORIGINS.
  origin: string;
  fetch?: typeof fetch;
}

export interface IdentityCall {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  cookie?: string;
  body?: RequestInit["body"];
  contentType?: string | null;
  // End user's IP, sent as X-Forwarded-For (Better-Auth rate limits by it).
  clientIp?: string;
}

export type IdentityResponse =
  | { ok: true; response: Response; cookie: string }
  | { ok: false; reason: "timeout" | "network" };

type Failure = Exclude<IdentityResult<never>, { kind: "ok" }>;

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

async function toFailure(response: Response): Promise<Failure> {
  if (response.status === 401) {
    return { kind: "unauthenticated" };
  }
  if (response.status === 403) {
    return { kind: "forbidden" };
  }
  if (response.status >= 500) {
    return { kind: "unavailable", reason: "server_error" };
  }
  return { kind: "rejected", status: response.status, body: await readJson(response) };
}

function userFrom(body: { user?: Partial<IdentityUser> } | null): IdentityUser | null {
  const user = body?.user;
  if (!user?.id || typeof user.email !== "string") {
    return null;
  }
  return { id: user.id, email: user.email, name: user.name ?? "" };
}

export function createIdentityClient(options: IdentityClientOptions) {
  const doFetch = options.fetch ?? fetch;

  // Raw call: every Set-Cookie on the response is folded into the returned
  // cookie value; nothing is forwarded anywhere else.
  async function send(call: IdentityCall): Promise<IdentityResponse> {
    const headers = new Headers({ Origin: options.origin, Accept: "application/json" });
    if (call.cookie) {
      headers.set("Cookie", call.cookie);
    }
    if (call.contentType) {
      headers.set("Content-Type", call.contentType);
    }
    if (call.clientIp) {
      headers.set("X-Forwarded-For", call.clientIp);
    }
    try {
      const response = await doFetch(new URL(call.path, options.baseUrl), {
        method: call.method,
        headers,
        body: call.body ?? undefined,
        redirect: "manual",
        signal: AbortSignal.timeout(TTL.upstreamTimeoutMs),
      });
      const cookie = applySetCookies(
        call.cookie ?? "",
        response.headers.getSetCookie(),
        new Date(),
      );
      return { ok: true, response, cookie };
    } catch (err) {
      // AbortSignal.timeout rejects with a DOMException, which is not an
      // `Error` instance in every realm — match on the name only.
      const reason =
        (err as { name?: unknown } | null)?.name === "TimeoutError" ? "timeout" : "network";
      return { ok: false, reason };
    }
  }

  async function sendJson(
    method: IdentityCall["method"],
    path: string,
    cookie?: string,
    body?: unknown,
    clientIp?: string,
  ) {
    return send({
      method,
      path,
      cookie,
      clientIp,
      body: body === undefined ? null : JSON.stringify(body),
      contentType: body === undefined ? null : "application/json",
    });
  }

  async function authenticate(
    path: string,
    body: unknown,
    cookie: string | undefined,
    clientIp: string | undefined,
  ): Promise<AuthenticationResult> {
    const result = await sendJson("POST", path, cookie, body, clientIp);
    if (!result.ok) {
      return { kind: "unavailable", reason: result.reason };
    }
    if (!result.response.ok) {
      return toFailure(result.response);
    }
    const json = (await readJson(result.response)) as {
      twoFactorRedirect?: boolean;
      user?: IdentityUser;
    } | null;
    if (json?.twoFactorRedirect) {
      return { kind: "two_factor_required", cookie: result.cookie };
    }
    const user = userFrom(json);
    if (!user) {
      return { kind: "unavailable", reason: "server_error" };
    }
    return { kind: "ok", data: user, cookie: result.cookie };
  }

  async function getJson<T>(
    path: string,
    cookie: string,
    method: IdentityCall["method"] = "GET",
    body?: unknown,
  ) {
    const result = await sendJson(method, path, cookie, body);
    if (!result.ok) {
      return { kind: "unavailable", reason: result.reason } as const;
    }
    if (!result.response.ok) {
      return toFailure(result.response);
    }
    return {
      kind: "ok",
      data: (await readJson(result.response)) as T,
      cookie: result.cookie,
    } as const;
  }

  return {
    send,

    signUp(input: { email: string; password: string; name: string }, clientIp?: string) {
      return authenticate("/api/auth/sign-up/email", input, undefined, clientIp);
    },

    signIn(input: { email: string; password: string }, clientIp?: string) {
      return authenticate("/api/auth/sign-in/email", input, undefined, clientIp);
    },

    // `cookie` is the one returned with two_factor_required.
    verifyTotp(cookie: string, code: string, clientIp?: string) {
      return authenticate("/api/auth/two-factor/verify-totp", { code }, cookie, clientIp);
    },

    async signOut(cookie: string): Promise<IdentityResult<null>> {
      const result = await getJson<unknown>("/api/auth/sign-out", cookie, "POST", {});
      return result.kind === "ok" ? { ...result, data: null } : result;
    },

    async getSession(cookie: string): Promise<IdentityResult<IdentitySession>> {
      const result = await getJson<{
        user?: IdentityUser;
        session?: { expiresAt?: string };
      } | null>("/api/auth/get-session", cookie);
      if (result.kind !== "ok") {
        return result;
      }
      // Better-Auth answers 200 + null for a missing/expired session.
      const user = userFrom(result.data);
      const expiresAt = result.data?.session?.expiresAt;
      if (!user || !expiresAt) {
        return { kind: "unauthenticated" };
      }
      return { kind: "ok", data: { user, expiresAt: new Date(expiresAt) }, cookie: result.cookie };
    },

    introspectHousehold(
      cookie: string,
      hid: string,
    ): Promise<IdentityResult<HouseholdIntrospection>> {
      return getJson<HouseholdIntrospection>(
        `/introspect/household?hid=${encodeURIComponent(hid)}`,
        cookie,
      );
    },

    async issueSessionToken(
      cookie: string,
      hid: string,
      appId: string,
    ): Promise<IdentityResult<string>> {
      const result = await getJson<{ token?: string }>(
        "/token?grant_type=session",
        cookie,
        "POST",
        { hid, appId },
      );
      if (result.kind !== "ok") {
        return result;
      }
      if (!result.data?.token) {
        return { kind: "unavailable", reason: "server_error" };
      }
      return { kind: "ok", data: result.data.token, cookie: result.cookie };
    },
  };
}

export type IdentityClient = ReturnType<typeof createIdentityClient>;
