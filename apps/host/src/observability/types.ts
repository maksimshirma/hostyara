export interface MetricEvent {
  kind: "resolve" | "load" | "mount" | "first-frame";
  appId: string;
  durationMs: number;
}

export interface ErrorContext {
  appId: string | null;
  remoteVersion: string | null;
}

export interface ErrorReport extends ErrorContext {
  source: "window-error" | "unhandledrejection" | "load-failed" | "mount-failed";
  message: string;
}

export interface ObservabilitySink {
  reportMetric(event: MetricEvent): void;
  reportError(event: ErrorReport): void;
}

export interface SessionSummary {
  crashesByApp: Record<string, number>;
  metrics: MetricEvent[];
  errors: ErrorReport[];
}

export interface Observability extends ObservabilitySink {
  getSummary(): SessionSummary;
  subscribe(listener: () => void): () => void;
}
