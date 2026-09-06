// The host owns window.history, so it owns scroll position across history
// entries too (tech.md §6) — apps never see window.history/window.location
// and have no way to do this themselves. Each entry's state carries a
// stable key; scroll offsets are kept in memory keyed by it and restored
// on popstate, after yielding a tick so the new content has laid out.
const SCROLL_KEY = "hostyaraScrollKey";

interface ScrollState {
  [SCROLL_KEY]: string;
}

function hasScrollKey(state: unknown): state is ScrollState {
  return (
    typeof state === "object" &&
    state !== null &&
    typeof (state as Record<string, unknown>)[SCROLL_KEY] === "string"
  );
}

export function readScrollKey(): string | null {
  const state: unknown = window.history.state;
  return hasScrollKey(state) ? state[SCROLL_KEY] : null;
}

export function createScrollRestoration() {
  const positions = new Map<string, number>();
  let nextKey = 0;

  function allocateKey(): ScrollState {
    return { [SCROLL_KEY]: String(nextKey++) };
  }

  return {
    // Best-effort: browsers not implementing the property (or jsdom) just
    // get a harmless own-property write.
    disableNativeRestoration(): void {
      window.history.scrollRestoration = "manual";
    },
    // Every entry needs a key, including the one the page loaded on —
    // otherwise a later "Back" into it has nothing to restore.
    ensureCurrentEntryHasKey(): ScrollState {
      const existing = readScrollKey();
      return existing !== null ? { [SCROLL_KEY]: existing } : allocateKey();
    },
    keyForNewEntry: allocateKey,
    keyForReplacedEntry(): ScrollState {
      const existing = readScrollKey();
      return existing !== null ? { [SCROLL_KEY]: existing } : allocateKey();
    },
    saveCurrentPosition(): void {
      const key = readScrollKey();
      if (key !== null) positions.set(key, window.scrollY);
    },
    restoreCurrentPosition(): void {
      const key = readScrollKey();
      const y = key !== null ? positions.get(key) : undefined;
      // Deferred: a popstate that also switches the mounted app changes
      // the slot's content asynchronously, so restoring on the same tick
      // would measure against the outgoing app's layout.
      window.setTimeout(() => window.scrollTo(0, y ?? 0), 0);
    },
  };
}
