import { installGlobalErrorHandlers } from "../globalErrorHandlers";

describe("installGlobalErrorHandlers", () => {
  it("tags a window error event with the currently active appId, remote version, and source", () => {
    const tag = jest.fn();
    const uninstall = installGlobalErrorHandlers(
      () => ({ appId: "recipes", remoteVersion: "1.2.3" }),
      tag,
    );

    const error = new Error("boom");
    window.dispatchEvent(new ErrorEvent("error", { error }));

    expect(tag).toHaveBeenCalledWith(
      { appId: "recipes", remoteVersion: "1.2.3" },
      error,
      "window-error",
    );
    uninstall();
  });

  it("tags an unhandled rejection with the currently active appId, remote version, and source", () => {
    const tag = jest.fn();
    const uninstall = installGlobalErrorHandlers(
      () => ({ appId: "budget", remoteVersion: "0.1.0" }),
      tag,
    );

    const reason = new Error("rejected");
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", { value: reason });
    window.dispatchEvent(event);

    expect(tag).toHaveBeenCalledWith(
      { appId: "budget", remoteVersion: "0.1.0" },
      reason,
      "unhandledrejection",
    );
    uninstall();
  });

  it("tags with null appId/remoteVersion when no app is active", () => {
    const tag = jest.fn();
    const uninstall = installGlobalErrorHandlers(() => ({ appId: null, remoteVersion: null }), tag);

    window.dispatchEvent(new ErrorEvent("error", { error: new Error("boom") }));

    expect(tag).toHaveBeenCalledWith(
      { appId: null, remoteVersion: null },
      expect.any(Error),
      "window-error",
    );
    uninstall();
  });

  it("removes both listeners when uninstalled", () => {
    const addSpy = jest.spyOn(window, "addEventListener");
    const removeSpy = jest.spyOn(window, "removeEventListener");
    const uninstall = installGlobalErrorHandlers(() => ({ appId: "recipes", remoteVersion: null }));

    uninstall();

    const addedTypes = addSpy.mock.calls.map(([type]) => type);
    const removedTypes = removeSpy.mock.calls.map(([type]) => type);
    expect(addedTypes).toEqual(expect.arrayContaining(["error", "unhandledrejection"]));
    expect(removedTypes).toEqual(expect.arrayContaining(["error", "unhandledrejection"]));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
