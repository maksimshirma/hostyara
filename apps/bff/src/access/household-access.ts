import type { IdentityClient } from "../identity/client";
import type { HouseholdIntrospection, IdentityResult } from "../identity/types";
import { persistIdentityCookie } from "../session/identity-sync";
import type { ActiveSession, SessionStore } from "../session/store";
import type { IntrospectionCache } from "./introspection-cache";

export interface HouseholdAccessDeps {
  store: SessionStore;
  identity: IdentityClient;
  introspectionCache: IntrospectionCache;
}

// Cached household introspection for this BFF session. Only successful
// answers are cached; 401/403 always come fresh from identity-service.
export async function loadHouseholdAccess(
  deps: HouseholdAccessDeps,
  session: ActiveSession,
  hid: string,
): Promise<IdentityResult<HouseholdIntrospection>> {
  const cached = deps.introspectionCache.get(session.idHash, hid);
  if (cached) {
    return { kind: "ok", data: cached, cookie: session.identityCookie };
  }
  const result = await deps.identity.introspectHousehold(session.identityCookie, hid);
  if (result.kind === "ok") {
    await persistIdentityCookie(deps.store, session, result.cookie);
    deps.introspectionCache.set(session.idHash, result.data);
  }
  return result;
}
