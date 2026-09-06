import { ObservabilitySink } from "./types";

// The default sink — swap for a real backend later by passing a different
// ObservabilitySink into createObservability; nothing else in the host
// depends on this being console-based.
export function createConsoleSink(): ObservabilitySink {
  return {
    reportMetric(event) {
      console.info(
        `[observability] ${event.kind} appId=${event.appId} ${event.durationMs.toFixed(1)}ms`,
      );
    },
    reportError(event) {
      console.error(
        `[observability] error appId=${event.appId ?? "none"} version=${event.remoteVersion ?? "none"} source=${event.source}: ${event.message}`,
      );
    },
  };
}
