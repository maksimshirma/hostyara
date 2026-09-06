import { Location as SdkLocation, SdkRouter } from "@hostyara/contracts";
import { HostRouter } from "./createHostRouter";

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

// Derived fresh from the host's current route rather than captured once at
// mount time: a household switch (hid change) while the same app stays
// mounted (T15) must not require a new SdkRouter instance, and re-deriving
// here keeps location/navigate/link correct with no extra wiring on the
// HostChrome side — every read already reflects window.location as of the
// moment it's called.
export function getLiveBasename(hostRouter: HostRouter, appId: string): string {
  const route = hostRouter.getRoute();
  if (route.kind === "space" && route.area.kind === "app" && route.area.appId === appId) {
    return route.area.basename;
  }
  // The route has already moved past this app (mid-unmount); the sdk is
  // about to be discarded, so any well-formed basename keeps the relative
  // helpers above from working with an empty prefix.
  return `/a/${appId}`;
}

function getRelativeLocation(hostRouter: HostRouter, appId: string): SdkLocation {
  const basename = getLiveBasename(hostRouter, appId);
  const location = hostRouter.getLocation();
  return {
    pathname: toRelativePathname(basename, location.pathname),
    search: location.search,
    hash: location.hash,
  };
}

export function createSdkRouter(hostRouter: HostRouter, appId: string): SdkRouter {
  return {
    get location() {
      return getRelativeLocation(hostRouter, appId);
    },
    navigate(to, opts) {
      hostRouter.navigate(toAbsolutePath(getLiveBasename(hostRouter, appId), to), opts);
    },
    back() {
      window.history.back();
    },
    subscribe(callback) {
      return hostRouter.subscribe(() => callback(getRelativeLocation(hostRouter, appId)));
    },
    link(to) {
      return toAbsolutePath(getLiveBasename(hostRouter, appId), to);
    },
  };
}
