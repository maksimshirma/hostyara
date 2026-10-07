import type { HouseholdIntrospection } from "../identity/types";

export type GatewayDecision = "allow" | "not_installed" | "no_grant";

// The gateway's whole authorization rule (access.md, «BFF (Шлюз)»): the app
// must be installed in the household and the user must hold a grant on it.
// Owner/admin grants are synthesized by identity-service, so there is no role
// logic here. What the grant allows (view vs edit) is the sub-app backend's
// call, made from the token's scope.
export function decideGatewayAccess(
  introspection: HouseholdIntrospection,
  appId: string,
): GatewayDecision {
  if (!introspection.installedApps.includes(appId)) {
    return "not_installed";
  }
  if (!Object.hasOwn(introspection.grants, appId)) {
    return "no_grant";
  }
  return "allow";
}
