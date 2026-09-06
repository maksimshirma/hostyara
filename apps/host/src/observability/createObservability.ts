import { createConsoleSink } from "./createConsoleSink";
import {
  ErrorReport,
  MetricEvent,
  Observability,
  ObservabilitySink,
  SessionSummary,
} from "./types";

// Wraps a sink with in-memory session state (crash counts, recent
// metrics/errors) that the dev overlay reads and re-renders from via
// subscribe() — the sink itself stays a pure "send this somewhere"
// interface with no memory of its own.
export function createObservability(sink: ObservabilitySink = createConsoleSink()): Observability {
  const metrics: MetricEvent[] = [];
  const errors: ErrorReport[] = [];
  const crashesByApp: Record<string, number> = {};
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of listeners) listener();
  }

  return {
    reportMetric(event) {
      metrics.push(event);
      sink.reportMetric(event);
      notify();
    },
    reportError(event) {
      errors.push(event);
      if (event.appId) crashesByApp[event.appId] = (crashesByApp[event.appId] ?? 0) + 1;
      sink.reportError(event);
      notify();
    },
    getSummary(): SessionSummary {
      return { crashesByApp: { ...crashesByApp }, metrics: [...metrics], errors: [...errors] };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
