import type { Context } from "hono";
import type { IdentityResult } from "../identity/types";

type NonOk = Exclude<IdentityResult<never>, { kind: "ok" }>;

// Uniform `{ error }` bodies for identity-service outcomes that every route
// answers the same way. `unauthenticated` is context-specific (wrong
// password vs. ended session) and stays with the caller.
export function respondToIdentityFailure(
  c: Context,
  result: Exclude<NonOk, { kind: "unauthenticated" }>,
) {
  switch (result.kind) {
    case "forbidden":
      return c.json({ error: "forbidden" }, 403);
    case "rejected": {
      const code = (result.body as { code?: unknown } | null)?.code;
      return c.json(
        { error: "rejected", ...(typeof code === "string" ? { code } : {}) },
        result.status as 400 | 404 | 409 | 422,
      );
    }
    case "unavailable":
      return result.reason === "timeout"
        ? c.json({ error: "upstream_timeout" }, 504)
        : c.json({ error: "upstream_unavailable" }, 502);
  }
}
