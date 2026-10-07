import type { Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { buildDownstreamHeaders } from "../gateway/upstream-request";
import { resolveClientIp } from "../middleware/client-ip";
import { endSession, persistIdentityCookie, type SessionDeps } from "../session/identity-sync";
import type { SessionEnv } from "../session/middleware";
import { isAllowedIdentityPath } from "./identity-allowlist";

const PREFIX = "/identity";
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;

export interface IdentityPassthroughDeps extends SessionDeps {
  trustProxy: boolean;
}

// The browser never talks to identity-service (cookie-session-transport.md):
// allow-listed calls go through here with the stored identity cookie, and any
// Set-Cookie identity sends back updates that stored value instead of
// reaching the browser. Expects requireSession + keepSessionAlive on /identity/*.
export function registerIdentityPassthrough(
  app: Hono<SessionEnv>,
  deps: IdentityPassthroughDeps,
): void {
  const limit = bodyLimit({
    maxSize: MAX_REQUEST_BODY_BYTES,
    onError: (c) => c.json({ error: "payload_too_large" }, 413),
  });

  app.all(`${PREFIX}/*`, limit, async (c: Context<SessionEnv>) => {
    const method = c.req.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    const path = c.req.path.slice(PREFIX.length);
    if (!isAllowedIdentityPath(method, path)) {
      return c.json({ error: "not_found" }, 404);
    }

    const session = c.get("session");
    const hasBody = c.req.method !== "GET" && c.req.method !== "HEAD";
    const result = await deps.identity.send({
      method,
      path: `${path}${new URL(c.req.url).search}`,
      cookie: session.identityCookie,
      body: hasBody ? await c.req.arrayBuffer() : null,
      contentType: c.req.header("Content-Type") ?? null,
      clientIp: resolveClientIp(c, deps.trustProxy),
    });
    if (!result.ok) {
      return result.reason === "timeout"
        ? c.json({ error: "upstream_timeout" }, 504)
        : c.json({ error: "upstream_unavailable" }, 502);
    }

    // A 401 here may be about the call itself (e.g. a wrong password on
    // step-up re-auth); only a dead identity session ends the BFF session.
    if (result.response.status === 401) {
      const check = await deps.identity.getSession(session.identityCookie);
      if (check.kind === "unauthenticated") {
        return endSession(c, deps.store, session);
      }
    }

    await persistIdentityCookie(deps.store, session, result.cookie);
    return new Response(result.response.body, {
      status: result.response.status,
      headers: buildDownstreamHeaders(result.response.headers),
    });
  });
}
