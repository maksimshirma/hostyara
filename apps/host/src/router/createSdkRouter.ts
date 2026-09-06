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

function getRelativeLocation(hostRouter: HostRouter, basename: string): SdkLocation {
  const location = hostRouter.getLocation();
  return {
    pathname: toRelativePathname(basename, location.pathname),
    search: location.search,
    hash: location.hash,
  };
}

export function createSdkRouter(hostRouter: HostRouter, basename: string): SdkRouter {
  return {
    get location() {
      return getRelativeLocation(hostRouter, basename);
    },
    navigate(to, opts) {
      hostRouter.navigate(toAbsolutePath(basename, to), opts);
    },
    back() {
      window.history.back();
    },
    subscribe(callback) {
      return hostRouter.subscribe(() => callback(getRelativeLocation(hostRouter, basename)));
    },
    link(to) {
      return toAbsolutePath(basename, to);
    },
  };
}
