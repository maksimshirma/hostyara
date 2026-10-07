/** @jest-environment node */
import { Hono } from "hono";
import { requireSession, type SessionEnv } from "../middleware";
import type { ActiveSession } from "../store";

const SESSION: ActiveSession = {
  idHash: "hash",
  userId: "u_1",
  identityCookie: "better-auth.session_token=x",
  expiresAt: new Date("2030-01-01T00:00:00Z"),
  syncedAt: new Date("2029-12-31T00:00:00Z"),
};

function createApp(findSession: (id: string) => Promise<ActiveSession | null>) {
  const app = new Hono<SessionEnv>();
  app.use("*", requireSession({ findSession }));
  app.get("/me", (c) => c.json({ userId: c.get("session").userId }));
  return app;
}

describe("requireSession", () => {
  it("passes the resolved session to the route", async () => {
    const findSession = jest.fn(async () => SESSION);
    const res = await createApp(findSession).request("/me", {
      headers: { Cookie: "__Host-session=raw-id" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "u_1" });
    expect(findSession).toHaveBeenCalledWith("raw-id", expect.any(Date));
  });

  it("answers 401 without a cookie and does not touch the store", async () => {
    const findSession = jest.fn(async () => SESSION);
    const res = await createApp(findSession).request("/me");

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthenticated" });
    expect(findSession).not.toHaveBeenCalled();
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("answers 401 and clears the cookie for an unknown or expired session", async () => {
    const res = await createApp(async () => null).request("/me", {
      headers: { Cookie: "__Host-session=stale" },
    });

    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toMatch(/^__Host-session=;.*Max-Age=0/);
  });

  it("ignores a cookie without the __Host- prefix", async () => {
    const findSession = jest.fn(async () => SESSION);
    const res = await createApp(findSession).request("/me", {
      headers: { Cookie: "session=raw-id" },
    });

    expect(res.status).toBe(401);
    expect(findSession).not.toHaveBeenCalled();
  });
});
