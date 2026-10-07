/** @jest-environment node */
import type { HouseholdIntrospection } from "../../identity/types";
import { createIntrospectionCache } from "../introspection-cache";

function introspection(userId: string, hid: string): HouseholdIntrospection {
  return { userId, hid, role: "member", installedApps: [], grants: {}, permissions: {} };
}

function setup() {
  let clock = 1_000;
  const cache = createIntrospectionCache({ ttlMs: 30_000, now: () => clock });
  return { cache, advance: (ms: number) => (clock += ms) };
}

describe("introspection cache", () => {
  it("returns a stored entry until the TTL elapses", () => {
    const { cache, advance } = setup();
    cache.set("s1", introspection("u1", "h1"));

    advance(29_999);
    expect(cache.get("s1", "h1")).toEqual(introspection("u1", "h1"));
    advance(1);
    expect(cache.get("s1", "h1")).toBeNull();
    expect(cache.size).toBe(0);
  });

  it("keeps sessions and households apart", () => {
    const { cache } = setup();
    cache.set("s1", introspection("u1", "h1"));

    expect(cache.get("s2", "h1")).toBeNull();
    expect(cache.get("s1", "h2")).toBeNull();
  });

  it("invalidates one member of a household across all their sessions", () => {
    const { cache } = setup();
    cache.set("s1", introspection("u1", "h1"));
    cache.set("s1-other-device", introspection("u1", "h1"));
    cache.set("s2", introspection("u2", "h1"));
    cache.set("s1", introspection("u1", "h2"));

    expect(cache.invalidate({ hid: "h1", userId: "u1" })).toBe(2);
    expect(cache.get("s1", "h1")).toBeNull();
    expect(cache.get("s1-other-device", "h1")).toBeNull();
    expect(cache.get("s2", "h1")).not.toBeNull();
    expect(cache.get("s1", "h2")).not.toBeNull();
  });

  it("invalidates every member when no user is given", () => {
    const { cache } = setup();
    cache.set("s1", introspection("u1", "h1"));
    cache.set("s2", introspection("u2", "h1"));
    cache.set("s3", introspection("u3", "h2"));

    expect(cache.invalidate({ hid: "h1" })).toBe(2);
    expect(cache.size).toBe(1);
  });

  it("prunes expired entries once it grows large", () => {
    const { cache, advance } = setup();
    for (let i = 0; i < 1000; i++) {
      cache.set(`s${i}`, introspection(`u${i}`, "h1"));
    }
    advance(30_000);
    cache.set("fresh", introspection("u", "h1"));

    expect(cache.size).toBe(1);
  });
});
