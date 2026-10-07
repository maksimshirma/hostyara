import type { Hono } from "hono";
import { loadHouseholdAccess, type HouseholdAccessDeps } from "../access/household-access";
import { endSession } from "../session/identity-sync";
import type { SessionEnv } from "../session/middleware";
import { respondToIdentityFailure } from "./identity-failure";

// Expects requireSession + keepSessionAlive on /api/* (see server.ts).
export function registerAccessRoutes(app: Hono<SessionEnv>, deps: HouseholdAccessDeps): void {
  app.get("/api/h/:hid/access", async (c) => {
    const session = c.get("session");
    const result = await loadHouseholdAccess(deps, session, c.req.param("hid"));
    if (result.kind === "unauthenticated") {
      return endSession(c, deps.store, session);
    }
    if (result.kind !== "ok") {
      return respondToIdentityFailure(c, result);
    }
    const { role, installedApps, grants, permissions } = result.data;
    return c.json({ role, installedApps, grants, permissions });
  });
}
