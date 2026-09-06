import { HostSDK, Location } from "@hostyara/contracts";

// Mirrors how the real host builds an app's sdk (HostChrome's buildSdk,
// T15): basename/context are read live off mutable internal state rather
// than frozen at construction, and a hid/context change is signaled over
// the exact same router.subscribe channel as a location change — there is
// no separate "context changed" event in the real contract, so a
// conformant app can't rely on one either.
export interface ConformanceSdk {
  sdk: HostSDK;
  subscriberCount(): number;
  pushLocation(location: Location): void;
  setHid(hid: string): void;
}

export function createConformanceSdk(appId: string): ConformanceSdk {
  let location: Location = { pathname: "/", search: "", hash: "" };
  let hid = "conformance-hid";
  const listeners = new Set<(location: Location) => void>();

  const sdk: HostSDK = {
    mode: "household",
    get basename() {
      return `/h/${hid}/a/${appId}`;
    },
    get context() {
      return {
        mode: "household" as const,
        hid,
        user: { id: "u1", name: "Conformance", email: "conformance@example.com" },
        permissions: [],
      };
    },
    router: {
      get location() {
        return location;
      },
      navigate(to) {
        const url = new URL(to, "http://internal");
        location = { pathname: url.pathname, search: url.search, hash: url.hash };
        for (const listener of listeners) listener(location);
      },
      back() {},
      subscribe(callback) {
        listeners.add(callback);
        return () => listeners.delete(callback);
      },
      link(to) {
        const suffix = to === "/" ? "" : to;
        return `${sdk.basename}${suffix}`;
      },
    },
    nav: { setBreadcrumbs: () => {}, setTitle: () => {} },
    apps: { open: () => {}, canOpen: () => false },
    share: {
      create: async () => ({ url: "", expiresAt: "" }),
      list: async () => [],
      revoke: async () => {},
    },
  };

  return {
    sdk,
    subscriberCount: () => listeners.size,
    pushLocation(next) {
      location = next;
      for (const listener of listeners) listener(location);
    },
    setHid(next) {
      hid = next;
      for (const listener of listeners) listener(location);
    },
  };
}
