import { canonicalizeHidSegment } from "./hid";
import { withGuardSuppressed } from "./historyGuard";
import { HouseholdLookup } from "./householdLookup";
import { parseRoute, Route } from "./route";
import { createScrollRestoration } from "./scrollRestoration";

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
  // Registers the popstate listener and does the initial canonicalization;
  // returns the matching detach function. Kept separate from construction
  // so a React effect can pair setup+teardown symmetrically — StrictMode's
  // mount→cleanup→mount otherwise fires a bare teardown with no matching
  // re-setup and permanently drops the listener.
  attach(): () => void;
  // Re-applies the canonical hid redirect to the current entry — for when
  // the household list the lookup reads from has changed (e.g. loaded
  // after sign-in).
  canonicalize(): void;
}

// IA §2: старая ссылка на пространство продолжает работать и сама
// приводит к новой канонической форме — реализовано как client-side
// redirect через replaceState, чтобы не плодить лишнюю запись в истории.
// Rewrites the entry in place, so it carries the existing state (the
// scroll-restoration key) forward rather than wiping it.
function redirectToCanonicalIfNeeded(households: HouseholdLookup): void {
  const route = parseRoute(window.location.pathname);
  if (route.kind !== "space") return;

  // Неизвестное пространство (список ещё не загружен — до входа — или
  // человек в нём не состоит) не трогаем: срезать хвост без знания
  // названия значит потерять его до того, как список появится.
  const household = households.resolve(route.hid);
  if (!household) return;
  const canonicalHidSegment = canonicalizeHidSegment(route.hid, household.name);
  if (canonicalHidSegment === route.hidSegment) return;

  const canonicalPathname = window.location.pathname.replace(
    `/h/${route.hidSegment}`,
    `/h/${canonicalHidSegment}`,
  );
  withGuardSuppressed(() =>
    window.history.replaceState(
      window.history.state,
      "",
      `${canonicalPathname}${window.location.search}${window.location.hash}`,
    ),
  );
}

export function createHostRouter(households: HouseholdLookup): HostRouter {
  const listeners = new Set<() => void>();
  const scroll = createScrollRestoration();

  function notify(): void {
    for (const listener of listeners) listener();
  }

  function handlePopState(): void {
    redirectToCanonicalIfNeeded(households);
    scroll.restoreCurrentPosition();
    notify();
  }

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
      scroll.saveCurrentPosition();
      withGuardSuppressed(() => {
        if (opts.replace) {
          window.history.replaceState(scroll.keyForReplacedEntry(), "", to);
        } else {
          window.history.pushState(scroll.keyForNewEntry(), "", to);
        }
      });
      redirectToCanonicalIfNeeded(households);
      notify();
    },
    subscribe(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    attach() {
      scroll.disableNativeRestoration();
      withGuardSuppressed(() =>
        window.history.replaceState(scroll.ensureCurrentEntryHasKey(), "", window.location.href),
      );
      redirectToCanonicalIfNeeded(households);
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    },
    canonicalize() {
      redirectToCanonicalIfNeeded(households);
      notify();
    },
  };
}
