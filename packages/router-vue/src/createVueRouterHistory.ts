import { HostSDK, Location as SdkLocation } from "@hostyara/contracts";
import { RouterHistory } from "vue-router";

// vue-router doesn't publicly export NavigationCallback/NavigationInformation
// (only RouterHistory itself), so the listener callback is typed loosely
// here and the finished object is asserted against the real interface.
type Listener = (
  to: string,
  from: string,
  info: { type: string; direction: string; delta: number },
) => void;

function toLocationString(location: SdkLocation): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

// Vue Router's history location is a single string (pathname+search+hash),
// unlike react-router's location object — sdk.router.navigate() already
// accepts that combined form as-is, so no further splitting is needed.
export function createVueRouterHistory(sdk: HostSDK): RouterHistory {
  const listeners = new Set<Listener>();
  let current = toLocationString(sdk.router.location);
  let suppressNextHostNotification = false;

  function notify(to: string, from: string, type: "pop" | "push"): void {
    for (const listener of listeners) {
      listener(to, from, { type, direction: "unknown", delta: 0 });
    }
  }

  sdk.router.subscribe((location) => {
    const from = current;
    current = toLocationString(location);
    if (suppressNextHostNotification) {
      suppressNextHostNotification = false;
      return;
    }
    notify(current, from, "pop");
  });

  const history = {
    base: "",
    state: {},
    get location() {
      return current;
    },
    push(to: string) {
      const from = current;
      suppressNextHostNotification = true;
      sdk.router.navigate(to);
      current = toLocationString(sdk.router.location);
      notify(current, from, "push");
    },
    replace(to: string) {
      const from = current;
      suppressNextHostNotification = true;
      sdk.router.navigate(to, { replace: true });
      current = toLocationString(sdk.router.location);
      notify(current, from, "pop");
    },
    go(delta: number) {
      if (delta === -1) {
        sdk.router.back();
        return;
      }
      window.history.go(delta);
    },
    listen(callback: Listener) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    createHref(to: string) {
      return sdk.router.link(to);
    },
    destroy() {
      listeners.clear();
    },
  };

  return history as RouterHistory;
}
