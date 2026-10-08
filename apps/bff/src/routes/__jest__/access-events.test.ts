/** @jest-environment node */
import { Hono } from "hono";
import { createIntrospectionCache } from "../../access/introspection-cache";
import { createAccessEventHub } from "../../events/access-event-hub";
import type { HouseholdIntrospection, IdentityResult } from "../../identity/types";
import { requireSession, type SessionEnv } from "../../session/middleware";
import { createFakeIdentity, createMemoryStore } from "../../test/fakes";
import { registerAccessEvents } from "../access-events";

const INTROSPECTION: HouseholdIntrospection = {
  userId: "u_1",
  hid: "h1",
  role: "member",
  installedApps: [],
  grants: {},
  permissions: {},
};

type Introspect = () => Promise<IdentityResult<HouseholdIntrospection>>;

async function setup(
  introspect: Introspect = async () => ({ kind: "ok", data: INTROSPECTION, cookie: "c=1" }),
) {
  const store = createMemoryStore();
  const accessEvents = createAccessEventHub();
  const { id, idHash } = await store.createSession({
    identityCookie: "c=1",
    userId: "u_1",
    expiresAt: new Date(Date.now() + 60_000),
    userAgent: null,
  });
  const app = new Hono<SessionEnv>();
  app.use("/api/*", requireSession(store));
  registerAccessEvents(app, {
    store,
    identity: createFakeIdentity({ introspectHousehold: introspect }),
    introspectionCache: createIntrospectionCache({ ttlMs: 30_000 }),
    accessEvents,
    heartbeatMs: 20,
  });
  const open = (hid = "h1") =>
    app.request(`/api/h/${hid}/events`, { headers: { Cookie: `__Host-session=${id}` } });
  return { open, store, idHash, accessEvents };
}

// Reads SSE text until `predicate` matches the accumulated output.
async function readUntil(res: Response, predicate: (text: string) => boolean): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (!predicate(text)) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    text += decoder.decode(value);
  }
  await reader.cancel();
  return text;
}

async function waitFor(condition: () => boolean) {
  while (!condition()) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe("GET /api/h/:hid/events", () => {
  it("streams access.changed events for the household without user ids", async () => {
    const { open, accessEvents } = await setup();

    const res = await open();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const reading = readUntil(res, (text) => text.includes("event: access.changed"));
    await waitFor(() => accessEvents.connectionCount === 1);
    accessEvents.publish({ hid: "h1", userId: "u_1", appId: "recipes" });

    const text = await reading;
    expect(text).toContain("event: ready");
    expect(text).toContain('data: {"hid":"h1","appId":"recipes"}');
    expect(text).not.toContain("u_1");
  });

  it("sends heartbeats and unsubscribes when the client goes away", async () => {
    const { open, accessEvents } = await setup();

    const text = await readUntil(await open(), (t) => t.includes(": heartbeat"));

    expect(text).toContain(": heartbeat");
    await waitFor(() => accessEvents.connectionCount === 0);
  });

  it("closes the stream once the BFF session is gone", async () => {
    const { open, store, idHash, accessEvents } = await setup();
    const res = await open();
    await waitFor(() => accessEvents.connectionCount === 1);

    await store.deleteSession(idHash);
    const text = await readUntil(res, (t) => t.includes("session.ended"));

    expect(text).toContain("event: session.ended");
    await waitFor(() => accessEvents.connectionCount === 0);
  });

  it("refuses households the user is not a member of", async () => {
    const { open, accessEvents } = await setup(async () => ({ kind: "forbidden" }));

    const res = await open("other");

    expect(res.status).toBe(403);
    expect(accessEvents.connectionCount).toBe(0);
  });
});
