import { ErrorContext } from "../observability/types";

export type ErrorSource = "window-error" | "unhandledrejection";

export type ErrorTagger = (context: ErrorContext, error: unknown, source: ErrorSource) => void;

const defaultTagger: ErrorTagger = (context, error, source) => {
  console.error(
    `[hostyara][appId=${context.appId ?? "none"}][version=${context.remoteVersion ?? "none"}][${source}]`,
    error,
  );
};

/**
 * A remote's own code can still throw outside our try/catch (a stray
 * setTimeout, an unhandled promise inside its render) — the error boundary
 * around mount() can't see those. These handlers catch them at the window
 * level and tag them with whichever app (and remote version) was being
 * loaded or was last mounted, so "the platform is slow" turns into "app X
 * version Y is slow".
 */
export function installGlobalErrorHandlers(
  getErrorContext: () => ErrorContext,
  tag: ErrorTagger = defaultTagger,
): () => void {
  function handleError(event: ErrorEvent): void {
    tag(getErrorContext(), event.error ?? event.message, "window-error");
  }

  function handleRejection(event: PromiseRejectionEvent): void {
    tag(getErrorContext(), event.reason, "unhandledrejection");
  }

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);

  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
  };
}
