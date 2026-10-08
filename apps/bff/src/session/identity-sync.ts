import type { Context } from "hono";
import type { IdentityClient } from "../identity/client";
import type { IdentitySession } from "../identity/types";
import { clearSessionCookie, readSessionCookie, setSessionCookie } from "./cookie";
import type { ActiveSession, SessionStore } from "./store";

export interface SessionDeps {
  store: SessionStore;
  identity: IdentityClient;
}

// Creates the BFF session for a freshly authenticated identity cookie. The
// BFF session's expiry is identity-service's, never a value of our own.
export async function establishSession(
  c: Context,
  deps: SessionDeps,
  identityCookie: string,
): Promise<{ kind: "ok"; session: IdentitySession } | { kind: "failed" }> {
  const result = await deps.identity.getSession(identityCookie);
  if (result.kind !== "ok") {
    return { kind: "failed" };
  }
  const { id } = await deps.store.createSession({
    identityCookie: result.cookie,
    userId: result.data.user.id,
    expiresAt: result.data.expiresAt,
    userAgent: c.req.header("User-Agent") ?? null,
  });
  setSessionCookie(c, id, result.data.expiresAt);
  return { kind: "ok", session: result.data };
}

// Identity-service said the session is gone (logout elsewhere, revoked
// device, expiry): the BFF session dies with it.
export async function endSession(c: Context, store: SessionStore, session: ActiveSession) {
  await store.deleteSession(session.idHash);
  clearSessionCookie(c);
  return c.json({ error: "unauthenticated" }, 401);
}

export async function persistIdentityCookie(
  store: SessionStore,
  session: ActiveSession,
  cookie: string,
) {
  if (cookie && cookie !== session.identityCookie) {
    await store.updateIdentityCookie(session.idHash, cookie);
  }
}

// Re-reads expiry and cookie from identity-service and slides the BFF cookie
// to the same moment. `ended` means the identity session no longer exists.
export async function syncSession(
  c: Context,
  deps: SessionDeps,
  session: ActiveSession,
  now: Date,
): Promise<
  | { kind: "ok"; identity: IdentitySession; session: ActiveSession }
  | { kind: "ended" }
  | { kind: "unavailable" }
> {
  const result = await deps.identity.getSession(session.identityCookie);
  if (result.kind === "unauthenticated") {
    return { kind: "ended" };
  }
  if (result.kind !== "ok") {
    return { kind: "unavailable" };
  }
  await persistIdentityCookie(deps.store, session, result.cookie);
  await deps.store.markSynced(session.idHash, result.data.expiresAt, now);
  const rawId = readSessionCookie(c);
  if (rawId) {
    setSessionCookie(c, rawId, result.data.expiresAt);
  }
  return {
    kind: "ok",
    identity: result.data,
    session: {
      ...session,
      identityCookie: result.cookie || session.identityCookie,
      expiresAt: result.data.expiresAt,
      syncedAt: now,
    },
  };
}
