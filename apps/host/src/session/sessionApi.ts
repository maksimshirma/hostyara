import { isSdkApiError, User } from "@hostyara/contracts";
import { BffClient } from "../api/bffClient";
import { Household, slugify } from "../router";

// The shell's own calls to the BFF's /auth/* and identity passthrough.
// Every failure the screens show is mapped here to one of these codes.

export type AuthFailure =
  | "invalid_credentials"
  | "invalid_code"
  | "already_registered"
  | "weak_password"
  | "expired"
  | "unavailable";

export type LoginOutcome =
  | { kind: "signed-in"; user: User }
  | { kind: "two-factor" }
  | { kind: "failed"; reason: AuthFailure };

function bffErrorCode(error: unknown): string | null {
  if (!isSdkApiError(error)) return null;
  const body = error.body as { error?: unknown; code?: unknown } | undefined;
  if (typeof body?.error === "string") return body.error;
  return error.code;
}

function toFailure(error: unknown): AuthFailure {
  const code = bffErrorCode(error);
  if (code === "invalid_credentials" || code === "invalid_code") return code;
  if (code === "unauthenticated") return "expired";
  const identityCode = isSdkApiError(error)
    ? (error.body as { code?: unknown } | undefined)?.code
    : undefined;
  if (typeof identityCode === "string" && identityCode.startsWith("USER_ALREADY_EXISTS"))
    return "already_registered";
  if (typeof identityCode === "string" && identityCode.startsWith("PASSWORD_TOO_"))
    return "weak_password";
  return "unavailable";
}

async function authenticate(
  request: Promise<{ user?: User; twoFactor?: boolean }>,
): Promise<LoginOutcome> {
  try {
    const result = await request;
    if (result.twoFactor) return { kind: "two-factor" };
    if (result.user) return { kind: "signed-in", user: result.user };
    return { kind: "failed", reason: "unavailable" };
  } catch (error) {
    return { kind: "failed", reason: toFailure(error) };
  }
}

export function createSessionApi(bff: BffClient) {
  return {
    // null when there is no session (the BFF answered unauthenticated).
    async fetchCurrentUser(): Promise<User | null> {
      try {
        return (await bff.request<{ user: User }>("/auth/me")).user;
      } catch (error) {
        if (isSdkApiError(error) && error.code === "unauthenticated") return null;
        throw error;
      }
    },

    login(email: string, password: string): Promise<LoginOutcome> {
      return authenticate(
        bff.request("/auth/login", { method: "POST", body: { email, password } }),
      );
    },

    verifyTwoFactor(code: string): Promise<LoginOutcome> {
      return authenticate(bff.request("/auth/2fa/verify", { method: "POST", body: { code } }));
    },

    signUp(name: string, email: string, password: string): Promise<LoginOutcome> {
      return authenticate(
        bff.request("/auth/signup", { method: "POST", body: { name, email, password } }),
      );
    },

    async logout(): Promise<void> {
      await bff.request("/auth/logout", { method: "POST", body: {} });
    },

    async listHouseholds(): Promise<Household[]> {
      const organizations = await bff.request<Array<{ id: string; name: string }>>(
        "/identity/api/auth/organization/list",
      );
      return organizations.map((organization) => ({
        hid: organization.id,
        name: organization.name,
      }));
    },

    async createHousehold(name: string): Promise<Household> {
      // Better-Auth wants a unique slug; the shell addresses households by id.
      const slug = `${slugify(name) || "household"}-${Math.random().toString(36).slice(2, 8)}`;
      const organization = await bff.request<{ id: string; name: string }>(
        "/identity/api/auth/organization/create",
        {
          method: "POST",
          body: { name, slug },
        },
      );
      return { hid: organization.id, name: organization.name };
    },
  };
}

export type SessionApi = ReturnType<typeof createSessionApi>;
