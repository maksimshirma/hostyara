import type { Migration } from "kysely/migration";
import * as sessions from "./0001_sessions";
import * as appBackends from "./0002_app_backends";

// Explicit registry instead of FileMigrationProvider: no runtime directory
// scan, so the same list works under tsx, compiled dist/ and jest. Keys sort
// lexicographically — prefix new entries with the next number.
export const migrations: Record<string, Migration> = {
  "0001_sessions": sessions,
  "0002_app_backends": appBackends,
};
