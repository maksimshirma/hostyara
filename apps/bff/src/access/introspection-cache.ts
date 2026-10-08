import type { HouseholdIntrospection } from "../identity/types";

interface Entry {
  value: HouseholdIntrospection;
  expiresAt: number;
}

export interface InvalidationScope {
  hid: string;
  userId?: string;
}

const PRUNE_THRESHOLD = 1000;

// Short-lived per (BFF session, household) cache of /introspect/household
// (bff-placement.md п.3). The TTL is only a safety net: access.changed
// webhooks drop the affected entries immediately (access.md).
export function createIntrospectionCache(options: { ttlMs: number; now?: () => number }) {
  const now = options.now ?? Date.now;
  const entries = new Map<string, Entry>();
  const keyOf = (sessionKey: string, hid: string) => `${sessionKey}\u0000${hid}`;

  function pruneExpired(at: number) {
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= at) {
        entries.delete(key);
      }
    }
  }

  return {
    get(sessionKey: string, hid: string): HouseholdIntrospection | null {
      const key = keyOf(sessionKey, hid);
      const entry = entries.get(key);
      if (!entry) {
        return null;
      }
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return null;
      }
      return entry.value;
    },

    set(sessionKey: string, value: HouseholdIntrospection): void {
      const at = now();
      if (entries.size >= PRUNE_THRESHOLD) {
        pruneExpired(at);
      }
      entries.set(keyOf(sessionKey, value.hid), { value, expiresAt: at + options.ttlMs });
    },

    // Without userId every member of the household is affected (e.g. an app
    // was installed or the household was deleted).
    invalidate(scope: InvalidationScope): number {
      let removed = 0;
      for (const [key, entry] of entries) {
        if (
          entry.value.hid === scope.hid &&
          (!scope.userId || entry.value.userId === scope.userId)
        ) {
          entries.delete(key);
          removed += 1;
        }
      }
      return removed;
    },

    get size(): number {
      return entries.size;
    },
  };
}

export type IntrospectionCache = ReturnType<typeof createIntrospectionCache>;
