import { createHistory, HistoryLocation, RouterHistory } from "@tanstack/react-router";
import { withGuardSuppressed } from "./historyGuard";

const INDEX_KEY = "__TSR_index";

type EntryState = HistoryLocation["state"];

function randomKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Entries this history didn't write (the landing page before the first
// replace, or one an app wrote directly despite the guard) carry no index —
// treat them as index 0 rather than crash on traversal.
function readState(win: Window): EntryState {
  const state = win.history.state as Partial<EntryState> | null;
  return { [INDEX_KEY]: 0, ...state } as EntryState;
}

function readLocation(win: Window): HistoryLocation {
  const { pathname, search, hash } = win.location;
  return { href: `${pathname}${search}${hash}`, pathname, search, hash, state: readState(win) };
}

function popAction(previous: EntryState, next: EntryState) {
  const delta = next[INDEX_KEY] - previous[INDEX_KEY];
  if (delta === -1) return { type: "BACK" as const };
  if (delta === 1) return { type: "FORWARD" as const };
  return { type: "GO" as const, index: delta };
}

// The single writer to window.history (IA §9). Unlike TanStack's own
// browser history it writes synchronously — sdk.router.location must
// reflect a navigate() immediately (packages/router-react relies on it) —
// and every write is marked as the host's own for the dev history guard.
export function createHostHistory(win: Window = window): RouterHistory {
  if (readState(win).__TSR_key === undefined) {
    const key = randomKey();
    withGuardSuppressed(() =>
      win.history.replaceState({ ...readState(win), key, __TSR_key: key }, "", win.location.href),
    );
  }

  let current = readLocation(win);
  const history = createHistory({
    getLocation: () => {
      current = readLocation(win);
      return current;
    },
    getLength: () => win.history.length,
    pushState: (href, state) => withGuardSuppressed(() => win.history.pushState(state, "", href)),
    replaceState: (href, state) =>
      withGuardSuppressed(() => win.history.replaceState(state, "", href)),
    back: () => win.history.back(),
    forward: () => win.history.forward(),
    go: (n) => win.history.go(n),
    createHref: (href) => href,
    // Traversals are reported from popstate below, once the browser has
    // actually moved — not when back()/go() is merely requested.
    notifyOnIndexChange: false,
    destroy: () => win.removeEventListener("popstate", handlePopState),
  });

  function handlePopState(): void {
    const previous = current.state;
    history.notify(popAction(previous, readState(win)));
  }
  win.addEventListener("popstate", handlePopState);

  return history;
}
