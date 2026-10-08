import { Location as SdkLocation, SdkRouter } from "@hostyara/contracts";
import { RouterHistory } from "@tanstack/react-router";
import { routeForPath } from "./hostRoute";
import { Route } from "./route";

// IA §9: адреса, которые видит приложение, относительны basename;
// наружу (link()) отдаются абсолютные.
function toRelativePathname(basename: string, pathname: string): string {
  if (pathname === basename) return "/";
  if (pathname.startsWith(`${basename}/`)) return pathname.slice(basename.length) || "/";
  return "/";
}

function toAbsolutePath(basename: string, to: string): string {
  const suffix = to === "/" ? "" : to;
  return `${basename}${suffix}`;
}

function currentRoute(history: RouterHistory): Route {
  return routeForPath(history.location.pathname);
}

function ownsCurrentRoute(history: RouterHistory, appId: string): boolean {
  const route = currentRoute(history);
  return route.kind === "space" && route.area.kind === "app" && route.area.appId === appId;
}

// Derived fresh from the host history's current location rather than
// captured once at mount time: a household switch (hid change) while the
// same app stays mounted (T15) must not require a new SdkRouter instance.
// The host history updates its location synchronously on every write, so
// each read reflects a navigate() made just before it.
export function getLiveBasename(history: RouterHistory, appId: string): string {
  const route = currentRoute(history);
  if (route.kind === "space" && route.area.kind === "app" && route.area.appId === appId) {
    return route.area.basename;
  }
  // The route has already moved past this app (mid-unmount); the sdk is
  // about to be discarded, so any well-formed basename keeps the relative
  // helpers above from working with an empty prefix.
  return `/a/${appId}`;
}

function getRelativeLocation(history: RouterHistory, appId: string): SdkLocation {
  const basename = getLiveBasename(history, appId);
  const { location } = history;
  return {
    pathname: toRelativePathname(basename, location.pathname),
    search: location.search,
    hash: location.hash,
  };
}

// sdk.router (IA §9) over the host history. App navigations go straight
// into the history with the href as is — the app's query is never
// re-serialized — and TanStack Router, subscribed to the same history,
// only matches them.
export function createSdkRouter(history: RouterHistory, appId: string): SdkRouter {
  return {
    get location() {
      return getRelativeLocation(history, appId);
    },
    navigate(to, opts) {
      // After Back/Forward away from the app it is still mounted until the
      // shell unmounts it, and its framework router may react to the
      // foreign location by navigating "home". Such a call must not
      // rewrite the address the person just went back to.
      if (!ownsCurrentRoute(history, appId)) return;
      const href = toAbsolutePath(getLiveBasename(history, appId), to);
      if (opts?.replace) history.replace(href);
      else history.push(href);
    },
    back() {
      history.back();
    },
    subscribe(callback) {
      return history.subscribe(() => callback(getRelativeLocation(history, appId)));
    },
    link(to) {
      return toAbsolutePath(getLiveBasename(history, appId), to);
    },
  };
}
