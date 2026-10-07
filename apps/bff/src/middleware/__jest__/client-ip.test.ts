/** @jest-environment node */
import { Hono } from "hono";
import { resolveClientIp } from "../client-ip";

function ipFor(trustProxy: boolean, headers: Record<string, string> = {}) {
  const app = new Hono();
  app.get("/", (c) => c.json({ ip: resolveClientIp(c, trustProxy) ?? null }));
  return Promise.resolve(app.request("/", { headers })).then((res) => res.json());
}

describe("resolveClientIp", () => {
  it("uses the entry our reverse proxy appended, ignoring client-supplied ones", async () => {
    expect(await ipFor(true, { "X-Forwarded-For": "6.6.6.6, 203.0.113.7" })).toEqual({
      ip: "203.0.113.7",
    });
  });

  it("ignores X-Forwarded-For when the proxy is not trusted", async () => {
    expect(await ipFor(false, { "X-Forwarded-For": "6.6.6.6" })).toEqual({ ip: null });
  });

  it("falls back to the socket address (none under app.request)", async () => {
    expect(await ipFor(true)).toEqual({ ip: null });
  });
});
