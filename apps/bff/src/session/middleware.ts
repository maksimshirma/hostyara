import type { MiddlewareHandler } from "hono";
import { clearSessionCookie, readSessionCookie } from "./cookie";
import type { ActiveSession, SessionStore } from "./store";

export interface SessionEnv {
  Variables: { session: ActiveSession };
}

// Resolves __Host-session to a live BFF session or answers 401 — routes
// behind it can rely on c.get("session").
export function requireSession(
  store: Pick<SessionStore, "findSession">,
): MiddlewareHandler<SessionEnv> {
  return async (c, next) => {
    const id = readSessionCookie(c);
    const session = id ? await store.findSession(id, new Date()) : null;
    if (!session) {
      if (id) {
        clearSessionCookie(c);
      }
      return c.json({ error: "unauthenticated" }, 401);
    }
    c.set("session", session);
    await next();
  };
}
