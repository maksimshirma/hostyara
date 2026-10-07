import { Hono } from "hono";
import type { IntrospectionCache } from "./access/introspection-cache";
import { TTL } from "./config/ttl";
import type { AccessEventHub } from "./events/access-event-hub";
import { csrfProtection } from "./middleware/csrf";
import { registerAccessRoutes } from "./routes/access";
import { registerAccessEvents } from "./routes/access-events";
import { registerAccessWebhook } from "./routes/access-webhook";
import { registerAuthRoutes } from "./routes/auth";
import { registerGatewayRoutes } from "./routes/gateway";
import { registerIdentityPassthrough } from "./routes/identity-passthrough";
import { registerHealthRoute } from "./routes/health";
import type { SessionDeps } from "./session/identity-sync";
import { keepSessionAlive } from "./session/keep-alive";
import { requireSession, type SessionEnv } from "./session/middleware";

export interface ServerDeps extends SessionDeps {
  publicUrl: string;
  trustProxy: boolean;
  introspectionCache: IntrospectionCache;
  accessEvents: AccessEventHub;
  findAppBackendUrl(appId: string): Promise<string | null>;
  pingDatabase: () => Promise<void>;
}

// Browser-facing: same origin as the shell.
export function createPublicApp(deps: ServerDeps): Hono<SessionEnv> {
  const app = new Hono<SessionEnv>();
  app.use("*", csrfProtection(deps.publicUrl));
  registerHealthRoute(app, deps.pingDatabase);
  registerAuthRoutes(app, deps);

  app.use("/identity/*", requireSession(deps.store), keepSessionAlive(deps));
  registerIdentityPassthrough(app, deps);

  app.use("/api/*", requireSession(deps.store), keepSessionAlive(deps));
  registerAccessRoutes(app, deps);
  registerAccessEvents(app, { ...deps, heartbeatMs: TTL.sseHeartbeatMs });
  registerGatewayRoutes(app, deps);
  return app;
}

// Never exposed outside the private network — receives identity-service
// webhooks, which are not signed yet.
export function createInternalApp(
  deps: Pick<ServerDeps, "pingDatabase" | "introspectionCache" | "accessEvents">,
): Hono {
  const app = new Hono();
  registerHealthRoute(app, deps.pingDatabase);
  registerAccessWebhook(app, deps);
  return app;
}
