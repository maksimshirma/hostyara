export type ErrorTagger = (appId: string | null, error: unknown) => void;

const defaultTagger: ErrorTagger = (appId, error) => {
  console.error(`[hostyara][appId=${appId ?? "none"}]`, error);
};

/**
 * A remote's own code can still throw outside our try/catch (a stray
 * setTimeout, an unhandled promise inside its render) — the error boundary
 * around mount() can't see those. These handlers catch them at the window
 * level and tag them with whichever app was being loaded or was last
 * mounted, so "the platform is slow" turns into "app X is slow".
 */
export function installGlobalErrorHandlers(
  getActiveAppId: () => string | null,
  tag: ErrorTagger = defaultTagger,
): () => void {
  function handleError(event: ErrorEvent): void {
    tag(getActiveAppId(), event.error ?? event.message);
  }

  function handleRejection(event: PromiseRejectionEvent): void {
    tag(getActiveAppId(), event.reason);
  }

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);

  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
  };
}
