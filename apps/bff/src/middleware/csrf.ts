import type { MiddlewareHandler } from "hono";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const ALLOWED_FETCH_SITES = new Set(["same-origin", "none"]);

export interface CsrfInput {
  method: string;
  secFetchSite: string | undefined;
  origin: string | undefined;
}

// One CSRF perimeter for the whole platform (token-storage.md п.4): the shell
// and BFF share one origin, so anything a browser marks as other than
// same-origin (or user-initiated, "none") is refused — same-site included,
// since a sibling subdomain is not trusted either. Browsers without Fetch
// Metadata fall back to an exact Origin match on state-changing requests.
export function isRequestAllowed(input: CsrfInput, publicOrigin: string): boolean {
  if (input.secFetchSite !== undefined) {
    return ALLOWED_FETCH_SITES.has(input.secFetchSite);
  }
  if (SAFE_METHODS.has(input.method.toUpperCase())) {
    return true;
  }
  return input.origin === publicOrigin;
}

export function csrfProtection(publicUrl: string): MiddlewareHandler {
  const publicOrigin = new URL(publicUrl).origin;
  return async (c, next) => {
    const allowed = isRequestAllowed(
      {
        method: c.req.method,
        secFetchSite: c.req.header("Sec-Fetch-Site"),
        origin: c.req.header("Origin"),
      },
      publicOrigin,
    );
    if (!allowed) {
      return c.json({ error: "forbidden" }, 403);
    }
    await next();
  };
}
