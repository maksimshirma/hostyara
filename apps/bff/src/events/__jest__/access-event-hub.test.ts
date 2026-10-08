/** @jest-environment node */
import { createAccessEventHub } from "../access-event-hub";

describe("access event hub", () => {
  function setup() {
    const hub = createAccessEventHub();
    const received: Record<string, unknown[]> = { a1: [], a2: [], b1: [], other: [] };
    hub.subscribe({ userId: "a", hid: "h1" }, (e) => received.a1.push(e));
    hub.subscribe({ userId: "a", hid: "h1" }, (e) => received.a2.push(e));
    hub.subscribe({ userId: "b", hid: "h1" }, (e) => received.b1.push(e));
    hub.subscribe({ userId: "a", hid: "h2" }, (e) => received.other.push(e));
    return { hub, received };
  }

  it("delivers a user-scoped event to all of that user's tabs in the household", () => {
    const { hub, received } = setup();

    expect(hub.publish({ hid: "h1", userId: "a", appId: "recipes" })).toBe(2);
    expect(received.a1).toEqual([{ hid: "h1", userId: "a", appId: "recipes" }]);
    expect(received.a2).toHaveLength(1);
    expect(received.b1).toHaveLength(0);
    expect(received.other).toHaveLength(0);
  });

  it("delivers a household-wide event to every member watching it", () => {
    const { hub, received } = setup();

    expect(hub.publish({ hid: "h1" })).toBe(3);
    expect(received.other).toHaveLength(0);
  });

  it("stops delivering after unsubscribe", () => {
    const hub = createAccessEventHub();
    const listener = jest.fn();
    const unsubscribe = hub.subscribe({ userId: "a", hid: "h1" }, listener);

    unsubscribe();

    expect(hub.publish({ hid: "h1" })).toBe(0);
    expect(listener).not.toHaveBeenCalled();
    expect(hub.connectionCount).toBe(0);
  });
});
