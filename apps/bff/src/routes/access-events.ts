import type { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { loadHouseholdAccess, type HouseholdAccessDeps } from "../access/household-access";
import type { AccessChangedEvent, AccessEventHub } from "../events/access-event-hub";
import { endSession } from "../session/identity-sync";
import type { SessionEnv } from "../session/middleware";
import { respondToIdentityFailure } from "./identity-failure";

export interface AccessEventsDeps extends HouseholdAccessDeps {
  accessEvents: AccessEventHub;
  heartbeatMs: number;
}

// GET /api/h/:hid/events — Server-Sent Events for the open tab
// (HostSDK.access.subscribe). Membership is checked on connect; while open,
// each heartbeat also confirms the BFF session still exists, so a logout
// closes the stream. Events carry only { hid, appId? }: the tab re-reads its
// access through the normal endpoints.
export function registerAccessEvents(app: Hono<SessionEnv>, deps: AccessEventsDeps): void {
  app.get("/api/h/:hid/events", async (c) => {
    const session = c.get("session");
    const hid = c.req.param("hid");
    const access = await loadHouseholdAccess(deps, session, hid);
    if (access.kind === "unauthenticated") {
      return endSession(c, deps.store, session);
    }
    if (access.kind !== "ok") {
      return respondToIdentityFailure(c, access);
    }

    return streamSSE(c, async (stream) => {
      const pending: AccessChangedEvent[] = [];
      let wake: (() => void) | null = null;
      const unsubscribe = deps.accessEvents.subscribe({ userId: session.userId, hid }, (event) => {
        pending.push(event);
        wake?.();
      });
      let open = true;
      stream.onAbort(() => {
        open = false;
        wake?.();
      });

      try {
        await stream.writeSSE({ event: "ready", data: JSON.stringify({ hid }) });
        while (open) {
          const timedOut = await new Promise<boolean>((resolve) => {
            const timer = setTimeout(() => resolve(true), deps.heartbeatMs);
            wake = () => {
              clearTimeout(timer);
              resolve(false);
            };
            if (pending.length > 0 || !open) {
              wake();
            }
          });
          wake = null;
          for (const event of pending.splice(0)) {
            await stream.writeSSE({
              event: "access.changed",
              data: JSON.stringify({
                hid: event.hid,
                ...(event.appId ? { appId: event.appId } : {}),
              }),
            });
          }
          if (timedOut && open) {
            const stillLoggedIn = await deps.store.isSessionActive(session.idHash, new Date());
            if (!stillLoggedIn) {
              await stream.writeSSE({ event: "session.ended", data: "{}" });
              break;
            }
            await stream.write(": heartbeat\n\n");
          }
        }
      } finally {
        unsubscribe();
      }
    });
  });
}
