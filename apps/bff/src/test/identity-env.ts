import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { Pool } from "pg";
import { loadEnv } from "../config/env";

// The full-stack integration suite runs against a real identity-service
// (IDENTITY_URL from apps/bff/.env, started with PORT=3001 and
// TRUSTED_ORIGINS containing BFF_PUBLIC_URL). identity-service has no API for
// installing an app into a household, so — like its own tests — the suite
// writes installed_apps directly; the database settings come from the
// sibling identity-service checkout's .env (IDENTITY_SERVICE_DIR overrides
// where that is).
function identityServiceEnv(): Record<string, string | undefined> {
  const dir =
    process.env.IDENTITY_SERVICE_DIR ?? path.resolve(__dirname, "../../../../../identity-service");
  const file = path.join(dir, ".env");
  if (!existsSync(file)) {
    throw new Error(`identity-service .env not found at ${file} (set IDENTITY_SERVICE_DIR)`);
  }
  return parseEnv(readFileSync(file, "utf8"));
}

export function identityUrl(): string {
  return loadEnv().identityUrl;
}

export async function assertIdentityServiceUp(): Promise<void> {
  const url = new URL("/health", identityUrl());
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) {
    throw new Error(
      `identity-service is not reachable at ${url}. Start it with: ` +
        "PORT=3001 TRUSTED_ORIGINS=http://localhost:3000 pnpm dev (in ../identity-service)",
    );
  }
}

export function createIdentityDatabase(): Pool {
  const env = identityServiceEnv();
  return new Pool({
    host: env.POSTGRES_HOST ?? "localhost",
    port: Number(env.POSTGRES_PORT ?? 5432),
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
  });
}
