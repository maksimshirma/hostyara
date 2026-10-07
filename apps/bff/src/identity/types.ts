export type GrantLevel = "view" | "edit";

// GET /introspect/household (session-introspection.md, access.md).
export interface HouseholdIntrospection {
  userId: string;
  hid: string;
  role: string;
  installedApps: string[];
  grants: Record<string, GrantLevel>;
  permissions: Record<string, string[]>;
}

export interface IdentityUser {
  id: string;
  email: string;
  name: string;
}

export interface IdentitySession {
  user: IdentityUser;
  expiresAt: Date;
}

// `cookie` is the identity cookie header after this call — callers persist it
// whenever it differs from what they sent.
export type IdentityResult<T> =
  | { kind: "ok"; data: T; cookie: string }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "rejected"; status: number; body: unknown }
  | { kind: "unavailable"; reason: "timeout" | "network" | "server_error" };

// Sign-up / sign-in / TOTP verification may also stop at the 2FA step.
export type AuthenticationResult =
  | IdentityResult<IdentityUser>
  | { kind: "two_factor_required"; cookie: string };
