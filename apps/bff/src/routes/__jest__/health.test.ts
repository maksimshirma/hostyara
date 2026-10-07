/** @jest-environment node */
import { Hono } from "hono";
import { registerHealthRoute } from "../health";

function createApp(pingDatabase: () => Promise<void>): Hono {
  const app = new Hono();
  registerHealthRoute(app, pingDatabase);
  return app;
}

describe("GET /health", () => {
  it("reports ok when the database answers", async () => {
    const res = await createApp(async () => {}).request("/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("reports 503 without leaking the error when the database is down", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await createApp(async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:5434");
    }).request("/health");

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "error" });
  });
});
