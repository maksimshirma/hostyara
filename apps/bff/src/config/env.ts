import { existsSync } from "node:fs";
import path from "node:path";

export interface Env {
  publicPort: number;
  internalPort: number;
  // Origin the browser sees for the shell + BFF (single-origin setup). Sent
  // as `Origin` on server-to-server calls to identity-service and used as
  // the CSRF reference origin.
  publicUrl: string;
  identityUrl: string;
  // This BFF's row in identity-service's `clients` table.
  clientId: string;
  // True when the BFF runs behind our own reverse proxy: the client IP is then
  // the last X-Forwarded-For entry instead of the socket address.
  trustProxy: boolean;
  // base64-encoded 32-byte key for encrypting stored identity sessions.
  sessionEncKey: string;
  postgres: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
}

function requireValue(source: NodeJS.ProcessEnv, name: string): string {
  const value = source[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parsePort(source: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = source[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid port in env var ${name}: ${raw}`);
  }
  return port;
}

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const publicPort = parsePort(source, "PORT", 4000);
  return {
    publicPort,
    internalPort: parsePort(source, "INTERNAL_PORT", 4001),
    publicUrl: source.BFF_PUBLIC_URL || `http://localhost:${publicPort}`,
    identityUrl: requireValue(source, "IDENTITY_URL"),
    clientId: source.BFF_CLIENT_ID || "hostyara-bff",
    trustProxy: source.TRUST_PROXY === "true",
    sessionEncKey: requireValue(source, "SESSION_ENC_KEY"),
    postgres: {
      host: source.POSTGRES_HOST || "localhost",
      port: parsePort(source, "POSTGRES_PORT", 5432),
      user: requireValue(source, "POSTGRES_USER"),
      password: requireValue(source, "POSTGRES_PASSWORD"),
      database: requireValue(source, "POSTGRES_DB"),
    },
  };
}

export function loadEnv(): Env {
  const envFile = path.resolve(__dirname, "../../.env");
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }
  return parseEnv(process.env);
}
