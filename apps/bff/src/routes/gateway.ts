import type { Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { decideGatewayAccess } from "../access/decide-gateway-access";
import { loadHouseholdAccess, type HouseholdAccessDeps } from "../access/household-access";
import { TTL } from "../config/ttl";
import {
  buildDownstreamHeaders,
  buildUpstreamHeaders,
  buildUpstreamUrl,
} from "../gateway/upstream-request";
import { endSession, persistIdentityCookie } from "../session/identity-sync";
import type { SessionEnv } from "../session/middleware";
import { respondToIdentityFailure } from "./identity-failure";

export interface GatewayDeps extends HouseholdAccessDeps {
  findAppBackendUrl(appId: string): Promise<string | null>;
  fetch?: typeof fetch;
}

const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024;
export const UPSTREAM_MARKER = "X-Hostyara-Upstream";
// "", "api", "h", hid, "apps", appId
const PREFIX_SEGMENTS = 6;

function subPathOf(rawPath: string): string {
  return `/${rawPath.split("/").slice(PREFIX_SEGMENTS).join("/")}`;
}

async function forwardToBackend(
  c: Context,
  doFetch: typeof fetch,
  url: URL,
  token: string,
): Promise<Response> {
  const method = c.req.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  try {
    const upstream = await doFetch(url, {
      method,
      headers: buildUpstreamHeaders(c.req.raw.headers, token),
      body: hasBody ? await c.req.arrayBuffer() : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(TTL.upstreamTimeoutMs),
    });
    const headers = buildDownstreamHeaders(upstream.headers);
    // Lets the host tell the app backend's own answers (any status, any
    // body) apart from the BFF's `{ error }` responses.
    headers.set(UPSTREAM_MARKER, "app");
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (err) {
    if ((err as { name?: unknown } | null)?.name === "TimeoutError") {
      return c.json({ error: "upstream_timeout" }, 504);
    }
    console.error(`[gateway] ${url.host} unreachable`, err);
    return c.json({ error: "upstream_unavailable" }, 502);
  }
}

// «Шлюз» (access.md): installed + granted → fresh internal JWT from
// identity-service → proxy to the sub-app backend. Expects requireSession +
// keepSessionAlive on /api/*.
export function registerGatewayRoutes(app: Hono<SessionEnv>, deps: GatewayDeps): void {
  const doFetch = deps.fetch ?? fetch;
  const limit = bodyLimit({
    maxSize: MAX_REQUEST_BODY_BYTES,
    onError: (c) => c.json({ error: "payload_too_large" }, 413),
  });

  const handler = async (c: Context<SessionEnv>) => {
    const session = c.get("session");
    const hid = c.req.param("hid") as string;
    const appId = c.req.param("appId") as string;

    const access = await loadHouseholdAccess(deps, session, hid);
    if (access.kind === "unauthenticated") {
      return endSession(c, deps.store, session);
    }
    if (access.kind !== "ok") {
      return respondToIdentityFailure(c, access);
    }
    const decision = decideGatewayAccess(access.data, appId);
    if (decision === "not_installed") {
      return c.json({ error: "not_installed" }, 404);
    }
    if (decision === "no_grant") {
      return c.json({ error: "no_grant" }, 403);
    }

    const baseUrl = await deps.findAppBackendUrl(appId);
    if (!baseUrl) {
      console.error(`[gateway] no backend registered for installed app "${appId}"`);
      return c.json({ error: "upstream_unavailable" }, 502);
    }
    const url = buildUpstreamUrl(baseUrl, subPathOf(c.req.path), new URL(c.req.url).search);
    if (!url) {
      return c.json({ error: "bad_request" }, 400);
    }

    const token = await deps.identity.issueSessionToken(session.identityCookie, hid, appId);
    if (token.kind === "unauthenticated") {
      return endSession(c, deps.store, session);
    }
    if (token.kind === "forbidden") {
      // The grant went away after the introspection was cached.
      deps.introspectionCache.invalidate({ hid, userId: session.userId });
      return c.json({ error: "no_grant" }, 403);
    }
    if (token.kind !== "ok") {
      return respondToIdentityFailure(c, token);
    }
    await persistIdentityCookie(deps.store, session, token.cookie);

    return forwardToBackend(c, doFetch, url, token.data);
  };

  app.all("/api/h/:hid/apps/:appId", limit, handler);
  app.all("/api/h/:hid/apps/:appId/*", limit, handler);
}
