import { AccessSnapshot, AccessStatus } from "../api/accessTracker";

export type AppAccessDecision =
  | "allow"
  // Access for the household hasn't loaded yet.
  | "pending"
  | "not-installed"
  | "no-grant"
  // The person is not a member of the household in the URL.
  | "not-member"
  // Access could not be loaded (BFF or identity-service unreachable).
  | "unavailable";

// Whether the shell may mount `appId` (IA 13.7): installed in the household
// and granted to this person. The shell only reflects the backend's decision
// — the BFF gateway enforces the same rule on every request.
export function decideAppAccess(
  status: AccessStatus,
  snapshot: AccessSnapshot | null,
  appId: string,
): AppAccessDecision {
  if (status === "forbidden") return "not-member";
  if (status === "error") return "unavailable";
  if (!snapshot) return "pending";
  if (!snapshot.installedApps.includes(appId)) return "not-installed";
  if (!Object.hasOwn(snapshot.grants, appId)) return "no-grant";
  return "allow";
}
