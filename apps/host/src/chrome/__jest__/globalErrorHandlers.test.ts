import { installGlobalErrorHandlers } from "../globalErrorHandlers";

describe("installGlobalErrorHandlers", () => {
  it("tags a window error event with the currently active appId", () => {
    const tag = jest.fn();
    const uninstall = installGlobalErrorHandlers(() => "recipes", tag);

    const error = new Error("boom");
    window.dispatchEvent(new ErrorEvent("error", { error }));

    expect(tag).toHaveBeenCalledWith("recipes", error);
    uninstall();
  });

  it("tags an unhandled rejection with the currently active appId", () => {
    const tag = jest.fn();
    const uninstall = installGlobalErrorHandlers(() => "budget", tag);

    const reason = new Error("rejected");
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", { value: reason });
    window.dispatchEvent(event);

    expect(tag).toHaveBeenCalledWith("budget", reason);
    uninstall();
  });

  it("tags with null when no app is active", () => {
    const tag = jest.fn();
    const uninstall = installGlobalErrorHandlers(() => null, tag);

    window.dispatchEvent(new ErrorEvent("error", { error: new Error("boom") }));

    expect(tag).toHaveBeenCalledWith(null, expect.any(Error));
    uninstall();
  });

  it("removes both listeners when uninstalled", () => {
    const addSpy = jest.spyOn(window, "addEventListener");
    const removeSpy = jest.spyOn(window, "removeEventListener");
    const uninstall = installGlobalErrorHandlers(() => "recipes");

    uninstall();

    const addedTypes = addSpy.mock.calls.map(([type]) => type);
    const removedTypes = removeSpy.mock.calls.map(([type]) => type);
    expect(addedTypes).toEqual(expect.arrayContaining(["error", "unhandledrejection"]));
    expect(removedTypes).toEqual(expect.arrayContaining(["error", "unhandledrejection"]));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
