import type { Context, Hono } from "hono";
import { TTL } from "../config/ttl";
import type { AuthenticationResult, IdentityUser } from "../identity/types";
import {
  clearLoginCookie,
  clearSessionCookie,
  readLoginCookie,
  readSessionCookie,
  setLoginCookie,
} from "../session/cookie";
import {
  endSession,
  establishSession,
  syncSession,
  type SessionDeps,
} from "../session/identity-sync";
import { requireSession, type SessionEnv } from "../session/middleware";
import { resolveClientIp } from "../middleware/client-ip";
import { respondToIdentityFailure } from "./identity-failure";

export interface AuthRouteDeps extends SessionDeps {
  trustProxy: boolean;
}

type Fields<K extends string> = Record<K, string>;

async function readFields<K extends string>(c: Context, keys: K[]): Promise<Fields<K> | null> {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return null;
  }
  const fields = {} as Fields<K>;
  for (const key of keys) {
    const value = body[key];
    if (typeof value !== "string" || value === "") {
      return null;
    }
    fields[key] = value;
  }
  return fields;
}

function publicUser(user: IdentityUser) {
  return { id: user.id, email: user.email, name: user.name };
}

// Shared tail of signup / login / 2FA: turn an authenticated identity cookie
// into a BFF session, or start the 2FA step.
async function completeAuthentication(
  c: Context,
  deps: SessionDeps,
  result: AuthenticationResult,
  unauthenticatedError: string,
) {
  if (result.kind === "two_factor_required") {
    const expiresAt = new Date(Date.now() + TTL.loginChallengeMs);
    const challengeId = await deps.store.createLoginChallenge(result.cookie, expiresAt);
    setLoginCookie(c, challengeId, expiresAt);
    return c.json({ twoFactor: true });
  }
  if (result.kind === "unauthenticated") {
    return c.json({ error: unauthenticatedError }, 401);
  }
  if (result.kind !== "ok") {
    return respondToIdentityFailure(c, result);
  }
  const established = await establishSession(c, deps, result.cookie);
  if (established.kind !== "ok") {
    return c.json({ error: "upstream_unavailable" }, 502);
  }
  return c.json({ user: publicUser(established.session.user) });
}

export function registerAuthRoutes(app: Hono<SessionEnv>, deps: AuthRouteDeps): void {
  const clientIp = (c: Context) => resolveClientIp(c, deps.trustProxy);

  app.post("/auth/signup", async (c) => {
    const fields = await readFields(c, ["email", "password", "name"]);
    if (!fields) {
      return c.json({ error: "bad_request" }, 400);
    }
    return completeAuthentication(
      c,
      deps,
      await deps.identity.signUp(fields, clientIp(c)),
      "unauthenticated",
    );
  });

  app.post("/auth/login", async (c) => {
    const fields = await readFields(c, ["email", "password"]);
    if (!fields) {
      return c.json({ error: "bad_request" }, 400);
    }
    return completeAuthentication(
      c,
      deps,
      await deps.identity.signIn(fields, clientIp(c)),
      "invalid_credentials",
    );
  });

  app.post("/auth/2fa/verify", async (c) => {
    const fields = await readFields(c, ["code"]);
    if (!fields) {
      return c.json({ error: "bad_request" }, 400);
    }
    const challengeId = readLoginCookie(c);
    const pendingCookie = challengeId
      ? await deps.store.findLoginChallenge(challengeId, new Date())
      : null;
    if (!challengeId || !pendingCookie) {
      clearLoginCookie(c);
      return c.json({ error: "unauthenticated" }, 401);
    }
    const result = await deps.identity.verifyTotp(pendingCookie, fields.code, clientIp(c));
    // A mistyped code keeps the challenge for another attempt until it expires.
    if (result.kind === "ok") {
      await deps.store.deleteLoginChallenge(challengeId);
      clearLoginCookie(c);
    }
    return completeAuthentication(c, deps, result, "invalid_code");
  });

  // Ends both sessions together (cookie-session-transport.md, «Логаут»). The
  // BFF session is removed even if identity-service cannot be reached, so
  // the browser is logged out either way.
  app.post("/auth/logout", async (c) => {
    const id = readSessionCookie(c);
    const session = id ? await deps.store.findSession(id, new Date()) : null;
    if (session) {
      const result = await deps.identity.signOut(session.identityCookie);
      if (result.kind !== "ok" && result.kind !== "unauthenticated") {
        console.error("[auth] identity sign-out failed, BFF session removed anyway", result.kind);
      }
      await deps.store.deleteSession(session.idHash);
    }
    clearSessionCookie(c);
    return c.json({ ok: true });
  });

  app.get("/auth/me", requireSession(deps.store), async (c) => {
    const session = c.get("session");
    const result = await syncSession(c, deps, session, new Date());
    if (result.kind === "ended") {
      return endSession(c, deps.store, session);
    }
    if (result.kind === "unavailable") {
      return c.json({ error: "upstream_unavailable" }, 502);
    }
    return c.json({ userId: result.identity.user.id, user: publicUser(result.identity.user) });
  });
}
