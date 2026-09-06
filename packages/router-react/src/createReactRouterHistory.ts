import { HostSDK } from "@hostyara/contracts";
import { NavigationType } from "react-router-dom";
import {
  HistoryAction,
  HistoryListener,
  HistoryLocation,
  Path,
  ReactRouterHistory,
  To,
} from "./types";

function toPath(to: To): Path {
  if (typeof to === "string") {
    const url = new URL(to, "http://internal");
    return { pathname: url.pathname, search: url.search, hash: url.hash };
  }
  return { pathname: to.pathname ?? "/", search: to.search ?? "", hash: to.hash ?? "" };
}

function toHref(path: Path): string {
  return `${path.pathname}${path.search}${path.hash}`;
}

// react-router drives all navigation through this object; sdk.router (T11)
// is the actual source of truth (IA §9), so every method here is a thin
// translation layer, never local state of its own.
export function createReactRouterHistory(sdk: HostSDK): ReactRouterHistory {
  let action: HistoryAction = NavigationType.Pop;
  const listeners = new Set<HistoryListener>();
  let suppressNextHostNotification = false;

  function currentLocation(): HistoryLocation {
    const location = sdk.router.location;
    return {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: null,
      key: "default",
    };
  }

  function notify(nextAction: HistoryAction): void {
    const location = currentLocation();
    for (const listener of listeners) listener({ action: nextAction, location, delta: 0 });
  }

  sdk.router.subscribe(() => {
    if (suppressNextHostNotification) {
      suppressNextHostNotification = false;
      return;
    }
    action = NavigationType.Pop;
    notify(NavigationType.Pop);
  });

  return {
    get action() {
      return action;
    },
    get location() {
      return currentLocation();
    },
    createHref(to) {
      return sdk.router.link(toHref(toPath(to)));
    },
    createURL(to) {
      return new URL(this.createHref(to), window.location.origin);
    },
    encodeLocation(to) {
      return toPath(to);
    },
    push(to) {
      action = NavigationType.Push;
      suppressNextHostNotification = true;
      sdk.router.navigate(toHref(toPath(to)));
      notify(NavigationType.Push);
    },
    replace(to) {
      action = NavigationType.Replace;
      suppressNextHostNotification = true;
      sdk.router.navigate(toHref(toPath(to)), { replace: true });
      notify(NavigationType.Replace);
    },
    go(delta) {
      if (delta === -1) {
        sdk.router.back();
        return;
      }
      window.history.go(delta);
    },
    listen(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
