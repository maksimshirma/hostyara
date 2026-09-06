import { createObservability } from "../createObservability";
import { ObservabilitySink } from "../types";

function fakeSink(): ObservabilitySink & { reportMetric: jest.Mock; reportError: jest.Mock } {
  return { reportMetric: jest.fn(), reportError: jest.fn() };
}

describe("createObservability", () => {
  it("forwards every metric to the sink and keeps it in the session summary", () => {
    const sink = fakeSink();
    const observability = createObservability(sink);
    const event = { kind: "load" as const, appId: "recipes", durationMs: 42 };

    observability.reportMetric(event);

    expect(sink.reportMetric).toHaveBeenCalledWith(event);
    expect(observability.getSummary().metrics).toEqual([event]);
  });

  it("forwards every error to the sink and keeps it in the session summary", () => {
    const sink = fakeSink();
    const observability = createObservability(sink);
    const event = {
      appId: "recipes",
      remoteVersion: "1.0.0",
      source: "window-error" as const,
      message: "boom",
    };

    observability.reportError(event);

    expect(sink.reportError).toHaveBeenCalledWith(event);
    expect(observability.getSummary().errors).toEqual([event]);
  });

  it("counts crashes per appId, ignoring errors with no appId", () => {
    const observability = createObservability(fakeSink());

    observability.reportError({
      appId: "recipes",
      remoteVersion: null,
      source: "window-error",
      message: "first",
    });
    observability.reportError({
      appId: "recipes",
      remoteVersion: null,
      source: "mount-failed",
      message: "second",
    });
    observability.reportError({
      appId: null,
      remoteVersion: null,
      source: "window-error",
      message: "no app",
    });

    expect(observability.getSummary().crashesByApp).toEqual({ recipes: 2 });
  });

  it("notifies subscribers on every metric and error report", () => {
    const observability = createObservability(fakeSink());
    const listener = jest.fn();
    observability.subscribe(listener);

    observability.reportMetric({ kind: "resolve", appId: "recipes", durationMs: 1 });
    observability.reportError({
      appId: "recipes",
      remoteVersion: null,
      source: "window-error",
      message: "x",
    });

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("stops notifying after unsubscribe", () => {
    const observability = createObservability(fakeSink());
    const listener = jest.fn();
    const unsubscribe = observability.subscribe(listener);

    unsubscribe();
    observability.reportMetric({ kind: "resolve", appId: "recipes", durationMs: 1 });

    expect(listener).not.toHaveBeenCalled();
  });

  it("getSummary returns a snapshot that further reports don't mutate", () => {
    const observability = createObservability(fakeSink());
    observability.reportMetric({ kind: "resolve", appId: "recipes", durationMs: 1 });
    const snapshot = observability.getSummary();

    observability.reportMetric({ kind: "load", appId: "recipes", durationMs: 2 });

    expect(snapshot.metrics).toHaveLength(1);
  });

  it("defaults to a working sink when none is given", () => {
    const observability = createObservability();

    expect(() =>
      observability.reportMetric({ kind: "resolve", appId: "recipes", durationMs: 1 }),
    ).not.toThrow();
  });
});
