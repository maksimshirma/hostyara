import type { MiddlewareHandler } from "hono";
import { TTL } from "../config/ttl";
import { endSession, syncSession, type SessionDeps } from "./identity-sync";
import type { SessionEnv } from "./middleware";

// Runs after requireSession. At most once per TTL.sessionSyncMs per session
// it re-syncs with identity-service, so an active session keeps sliding and a
// revoked one is cut off even on routes that never call identity themselves.
// identity-service being down does not log anyone out.
export function keepSessionAlive(deps: SessionDeps): MiddlewareHandler<SessionEnv> {
  return async (c, next) => {
    const now = new Date();
    const session = c.get("session");
    if (now.getTime() - session.syncedAt.getTime() >= TTL.sessionSyncMs) {
      const result = await syncSession(c, deps, session, now);
      if (result.kind === "ended") {
        return endSession(c, deps.store, session);
      }
      if (result.kind === "ok") {
        c.set("session", result.session);
      }
    }
    await next();
  };
}
