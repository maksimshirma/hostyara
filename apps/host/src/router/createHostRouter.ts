import { canonicalizeHidSegment } from "./hid";
import { HouseholdLookup } from "./loadHouseholds";
import { parseRoute, Route } from "./route";

export interface HostRouterLocation {
  pathname: string;
  search: string;
  hash: string;
}

export interface HostRouter {
  getLocation(): HostRouterLocation;
  getRoute(): Route;
  navigate(to: string, opts?: { replace?: boolean }): void;
  subscribe(callback: () => void): () => void;
  dispose(): void;
}

// IA §2: старая ссылка на пространство продолжает работать и сама
// приводит к новой канонической форме — реализовано как client-side
// redirect через replaceState, чтобы не плодить лишнюю запись в истории.
function redirectToCanonicalIfNeeded(households: HouseholdLookup): void {
  const route = parseRoute(window.location.pathname);
  if (route.kind !== "space") return;

  const household = households.resolve(route.hid);
  const canonicalHidSegment = canonicalizeHidSegment(route.hid, household?.name);
  if (canonicalHidSegment === route.hidSegment) return;

  const canonicalPathname = window.location.pathname.replace(
    `/h/${route.hidSegment}`,
    `/h/${canonicalHidSegment}`,
  );
  window.history.replaceState(
    null,
    "",
    `${canonicalPathname}${window.location.search}${window.location.hash}`,
  );
}

export function createHostRouter(households: HouseholdLookup): HostRouter {
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of listeners) listener();
  }

  function handlePopState(): void {
    redirectToCanonicalIfNeeded(households);
    notify();
  }

  redirectToCanonicalIfNeeded(households);
  window.addEventListener("popstate", handlePopState);

  return {
    getLocation() {
      return {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      };
    },
    getRoute() {
      return parseRoute(window.location.pathname);
    },
    navigate(to, opts = {}) {
      if (opts.replace) {
        window.history.replaceState(null, "", to);
      } else {
        window.history.pushState(null, "", to);
      }
      redirectToCanonicalIfNeeded(households);
      notify();
    },
    subscribe(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    dispose() {
      window.removeEventListener("popstate", handlePopState);
      listeners.clear();
    },
  };
}
