import { serve, type ServerType } from "@hono/node-server";
import { createIntrospectionCache } from "./access/introspection-cache";
import { loadEnv } from "./config/env";
import { TTL } from "./config/ttl";
import { createDatabase, pingDatabase } from "./db/kysely";
import { createAccessEventHub } from "./events/access-event-hub";
import { findAppBackendUrl } from "./gateway/app-backends";
import { createIdentityClient } from "./identity/client";
import { createInternalApp, createPublicApp } from "./server";
import { parseEncryptionKey } from "./session/crypto";
import { createSessionStore } from "./session/store";

const EXPIRED_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

function start(): void {
  const env = loadEnv();
  const db = createDatabase(env.postgres);
  const sessions = createSessionStore(db, parseEncryptionKey(env.sessionEncKey));
  const identity = createIdentityClient({
    baseUrl: env.identityUrl,
    origin: new URL(env.publicUrl).origin,
  });
  const deps = {
    publicUrl: env.publicUrl,
    trustProxy: env.trustProxy,
    introspectionCache: createIntrospectionCache({ ttlMs: TTL.introspectionMs }),
    accessEvents: createAccessEventHub(),
    pingDatabase: () => pingDatabase(db),
    findAppBackendUrl: (appId: string) => findAppBackendUrl(db, appId),
    store: sessions,
    identity,
  };

  const servers: ServerType[] = [
    serve({ fetch: createPublicApp(deps).fetch, port: env.publicPort }, (info) => {
      console.log(`bff public listening on http://localhost:${info.port}`);
    }),
    serve({ fetch: createInternalApp(deps).fetch, port: env.internalPort }, (info) => {
      console.log(`bff internal listening on http://localhost:${info.port}`);
    }),
  ];

  // Expired rows are already ignored on lookup; this only keeps the tables small.
  const sweep = setInterval(() => {
    sessions
      .deleteExpired(new Date())
      .catch((err) => console.error("[sessions] sweep failed", err));
  }, EXPIRED_SWEEP_INTERVAL_MS);
  sweep.unref();

  const shutdown = () => {
    clearInterval(sweep);
    for (const server of servers) {
      server.close();
    }
    void db.destroy();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

start();
