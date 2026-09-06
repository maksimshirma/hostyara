// Dev-only diagnostic: the host router is meant to be the sole writer to
// window.history/window.location. A remote that bypasses sdk.router and
// touches these directly (e.g. a framework router adapter mounted without
// the sdk history) silently desyncs the host's route state from the URL.
// This wraps the write APIs to warn with the offending app's id; it never
// changes behavior, and callers must still receive the real return value.
let suppressed = false;

export function withGuardSuppressed<T>(fn: () => T): T {
  const previous = suppressed;
  suppressed = true;
  try {
    return fn();
  } finally {
    suppressed = previous;
  }
}

function warn(method: string, getActiveAppId: () => string | null): void {
  const appId = getActiveAppId();
  console.warn(
    `[hostyara] "${method}" called directly on window.history/window.location by app ` +
      `"${appId ?? "unknown"}" — apps must navigate via sdk.router, not the browser APIs directly.`,
  );
}

// Some hosts (jsdom in tests, or a browser that hardens these properties)
// make pushState/replaceState/assign/replace non-writable — patching must
// be best-effort and fall back to a no-op restore rather than throw.
function patchMethod<T, K extends keyof T>(
  target: T,
  key: K,
  label: string,
  getActiveAppId: () => string | null,
): () => void {
  const original = target[key];
  if (typeof original !== "function") return () => {};

  try {
    const bound = original.bind(target) as T[K];
    target[key] = ((...args: unknown[]) => {
      if (!suppressed) warn(label, getActiveAppId);
      return (bound as (...a: unknown[]) => unknown)(...args);
    }) as T[K];
    return () => {
      target[key] = original;
    };
  } catch {
    return () => {};
  }
}

// window.location.href's setter is a legacy platform-object accessor and
// isn't interceptable via Object.defineProperty in any current browser, so
// only assign()/replace() (regular own properties on the instance) can be
// guarded here.
export function installDevHistoryGuard(getActiveAppId: () => string | null): () => void {
  if (process.env.NODE_ENV === "production") return () => {};

  const restorers = [
    patchMethod(window.history, "pushState", "history.pushState", getActiveAppId),
    patchMethod(window.history, "replaceState", "history.replaceState", getActiveAppId),
    patchMethod(window.location, "assign", "location.assign", getActiveAppId),
    patchMethod(window.location, "replace", "location.replace", getActiveAppId),
  ];

  return () => {
    for (const restore of restorers) restore();
  };
}
