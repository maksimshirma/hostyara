/** @jest-environment node */
import { Hono } from "hono";
import { createIntrospectionCache } from "../../access/introspection-cache";
import { createAccessEventHub } from "../../events/access-event-hub";
import { registerAccessWebhook } from "../access-webhook";

function setup() {
  const introspectionCache = createIntrospectionCache({ ttlMs: 30_000 });
  const accessEvents = createAccessEventHub();
  const app = new Hono();
  registerAccessWebhook(app, { introspectionCache, accessEvents });
  const post = (body: unknown) =>
    app.request("/webhooks/access-changed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  return { post, introspectionCache, accessEvents };
}

const entry = (userId: string, hid: string) => ({
  userId,
  hid,
  role: "member",
  installedApps: [],
  grants: {},
  permissions: {},
});

describe("POST /webhooks/access-changed", () => {
  it("drops the affected introspections and notifies open tabs", async () => {
    const { post, introspectionCache, accessEvents } = setup();
    introspectionCache.set("s1", entry("u1", "h1"));
    introspectionCache.set("s2", entry("u2", "h1"));
    const listener = jest.fn();
    accessEvents.subscribe({ userId: "u1", hid: "h1" }, listener);

    const res = await post({ hid: "h1", userId: "u1", appId: "recipes" });

    expect(res.status).toBe(204);
    expect(introspectionCache.get("s1", "h1")).toBeNull();
    expect(introspectionCache.get("s2", "h1")).not.toBeNull();
    expect(listener).toHaveBeenCalledWith({ hid: "h1", userId: "u1", appId: "recipes" });
  });

  it.each([[{}], [{ hid: "" }], [{ hid: 1 }], [{ hid: "h1", userId: 5 }], [null]])(
    "rejects malformed payload %j",
    async (body) => {
      const { post } = setup();

      expect((await post(body)).status).toBe(400);
    },
  );
});
