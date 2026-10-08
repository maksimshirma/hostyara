import { AccessEventSource, AccessSnapshot, createAccessTracker } from "../accessTracker";
import { BffClient } from "../bffClient";

const SNAPSHOT: AccessSnapshot = {
  role: "member",
  installedApps: ["recipes"],
  grants: { recipes: "view" },
  permissions: { recipes: ["storage.own"] },
};

class FakeEventSource implements AccessEventSource {
  readyState = 1;
  onerror: ((event: Event) => void) | null = null;
  closed = false;
  private listeners = new Map<string, Array<() => void>>();
  constructor(readonly url: string) {}
  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  emit(type: string) {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
  fail() {
    this.readyState = 2;
    this.onerror?.(new Event("error"));
  }
  close() {
    this.closed = true;
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(respond: (path: string) => Promise<unknown> = async () => SNAPSHOT) {
  const sources: FakeEventSource[] = [];
  const request = jest.fn((path: string) => respond(path));
  const bff = { request } as unknown as BffClient;
  const onSessionEnded = jest.fn();
  const tracker = createAccessTracker({
    bff,
    onSessionEnded,
    reconnectDelayMs: 10,
    createEventSource: (url) => {
      const source = new FakeEventSource(url);
      sources.push(source);
      return source;
    },
  });
  return { tracker, request, sources, onSessionEnded };
}

describe("createAccessTracker", () => {
  it("loads the household's access and subscribes to its event stream", async () => {
    const { tracker, request, sources } = setup();
    const listener = jest.fn();
    tracker.subscribe(listener);

    tracker.setHid("h1");
    expect(tracker.getStatus()).toBe("loading");
    await flush();

    expect(request).toHaveBeenCalledWith("/api/h/h1/access");
    expect(sources[0].url).toBe("/api/h/h1/events");
    expect(tracker.getSnapshot()).toEqual(SNAPSHOT);
    expect(tracker.getStatus()).toBe("ready");
    expect(listener).toHaveBeenCalled();
  });

  it("reloads on access.changed and notifies subscribers", async () => {
    let grants: AccessSnapshot["grants"] = { recipes: "view" };
    const { tracker, sources } = setup(async () => ({ ...SNAPSHOT, grants }));
    tracker.setHid("h1");
    await flush();
    const listener = jest.fn();
    tracker.subscribe(listener);

    grants = { recipes: "edit" };
    sources[0].emit("access.changed");
    await flush();

    expect(tracker.getSnapshot()?.grants).toEqual({ recipes: "edit" });
    expect(listener).toHaveBeenCalled();
  });

  it("re-reads access after the browser reconnects the stream", async () => {
    const { tracker, request, sources } = setup();
    tracker.setHid("h1");
    await flush();

    sources[0].emit("ready");
    sources[0].emit("ready");
    await flush();

    expect(request).toHaveBeenCalledTimes(2);
  });

  it("reconnects after the stream is closed for good", async () => {
    const { tracker, sources } = setup();
    tracker.setHid("h1");
    await flush();

    sources[0].fail();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(sources[0].closed).toBe(true);
    expect(sources).toHaveLength(2);
  });

  it("switches households: closes the old stream and ignores its late answers", async () => {
    let resolveFirst!: (value: unknown) => void;
    const { tracker, sources } = setup((path) =>
      path.includes("h1")
        ? new Promise((resolve) => (resolveFirst = resolve))
        : Promise.resolve({ ...SNAPSHOT, role: "owner" }),
    );
    tracker.setHid("h1");
    tracker.setHid("h2");
    resolveFirst(SNAPSHOT);
    await flush();

    expect(sources[0].closed).toBe(true);
    expect(sources[1].url).toBe("/api/h/h2/events");
    expect(tracker.getSnapshot()?.role).toBe("owner");
  });

  it("reports forbidden for a household the user is not in", async () => {
    const { tracker } = setup(async () => {
      throw { name: "SdkApiError", code: "forbidden", status: 403 };
    });
    tracker.setHid("other");
    await flush();

    expect(tracker.getStatus()).toBe("forbidden");
    expect(tracker.getSnapshot()).toBeNull();
  });

  it("hands session.ended to the shell", async () => {
    const { tracker, sources, onSessionEnded } = setup();
    tracker.setHid("h1");
    await flush();

    sources[0].emit("session.ended");

    expect(onSessionEnded).toHaveBeenCalled();
    expect(sources[0].closed).toBe(true);
  });
});
