import type { Hono } from "hono";
import type { IntrospectionCache } from "../access/introspection-cache";
import type { AccessChangedEvent, AccessEventHub } from "../events/access-event-hub";

export interface AccessWebhookDeps {
  introspectionCache: IntrospectionCache;
  accessEvents: AccessEventHub;
}

function parseEvent(body: unknown): AccessChangedEvent | null {
  const candidate = body as Record<string, unknown> | null;
  if (!candidate || typeof candidate.hid !== "string" || candidate.hid === "") {
    return null;
  }
  for (const key of ["userId", "appId"] as const) {
    if (candidate[key] !== undefined && typeof candidate[key] !== "string") {
      return null;
    }
  }
  return {
    hid: candidate.hid,
    ...(candidate.userId ? { userId: candidate.userId as string } : {}),
    ...(candidate.appId ? { appId: candidate.appId as string } : {}),
  };
}

// Internal listener only. identity-service calls this on any role /
// membership / grant / install change: the affected introspections are
// dropped right away (the 30 s TTL is just a fallback) and open tabs are told
// to re-evaluate.
export function registerAccessWebhook(app: Hono, deps: AccessWebhookDeps): void {
  app.post("/webhooks/access-changed", async (c) => {
    const event = parseEvent(await c.req.json().catch(() => null));
    if (!event) {
      return c.json({ error: "bad_request" }, 400);
    }
    deps.introspectionCache.invalidate(event);
    deps.accessEvents.publish(event);
    return c.body(null, 204);
  });
}
