import type { Context } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";

// The browser's IP, forwarded to identity-service as X-Forwarded-For so that
// Better-Auth rate-limits per user rather than throttling everyone behind the
// BFF's single address. With `trustProxy` (the BFF sits behind our own
// reverse proxy) the last X-Forwarded-For entry is the one that proxy
// appended; earlier entries are client-controlled and ignored.
export function resolveClientIp(c: Context, trustProxy: boolean): string | undefined {
  if (trustProxy) {
    const forwarded = c.req.header("X-Forwarded-For");
    const last = forwarded?.split(",").at(-1)?.trim();
    if (last) {
      return last;
    }
  }
  try {
    return getConnInfo(c).remote.address;
  } catch {
    // No Node socket (e.g. app.request() in tests).
    return undefined;
  }
}
