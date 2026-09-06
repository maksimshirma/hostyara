import { installDevHistoryGuard, withGuardSuppressed } from "../historyGuard";

describe("installDevHistoryGuard", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("warns with the active app id on an unsuppressed pushState call", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const detach = installDevHistoryGuard(() => "recipes");

    window.history.pushState(null, "", "/h/demo/a/recipes");

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("history.pushState");
    expect(warnSpy.mock.calls[0][0]).toContain("recipes");

    detach();
    warnSpy.mockRestore();
  });

  it("does not warn for a call wrapped in withGuardSuppressed", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const detach = installDevHistoryGuard(() => "recipes");

    withGuardSuppressed(() => window.history.replaceState(null, "", "/h/demo/a/budget"));

    expect(warnSpy).not.toHaveBeenCalled();

    detach();
    warnSpy.mockRestore();
  });

  it("restores the original methods on detach", () => {
    const originalPushState = window.history.pushState;
    const detach = installDevHistoryGuard(() => null);

    expect(window.history.pushState).not.toBe(originalPushState);
    detach();
    expect(window.history.pushState).toBe(originalPushState);
  });

  it("does not patch anything in production", () => {
    process.env.NODE_ENV = "production";
    const originalPushState = window.history.pushState;

    const detach = installDevHistoryGuard(() => null);

    expect(window.history.pushState).toBe(originalPushState);
    detach();
  });
});
