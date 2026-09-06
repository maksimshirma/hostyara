import { HostSDK } from "@hostyara/contracts";
import { createVueRouterHistory } from "../createVueRouterHistory";

function createFakeSdk(initialPathname: string) {
  let location = { pathname: initialPathname, search: "", hash: "" };
  const listeners = new Set<(loc: typeof location) => void>();

  const router = {
    get location() {
      return location;
    },
    navigate: jest.fn((to: string) => {
      location = { pathname: to, search: "", hash: "" };
      for (const listener of listeners) listener(location);
    }),
    back: jest.fn(),
    subscribe: jest.fn((callback: (loc: typeof location) => void) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    }),
    link: jest.fn((to: string) => `/h/f3k2xp/a/budget${to === "/" ? "" : to}`),
  };

  const sdk = { router } as unknown as HostSDK;
  return {
    sdk,
    router,
    externalChange: (pathname: string) => {
      location = { pathname, search: "", hash: "" };
      for (const listener of listeners) listener(location);
    },
  };
}

describe("createVueRouterHistory", () => {
  it("reports the current sdk.router location as a single string", () => {
    const { sdk } = createFakeSdk("/tx/42");
    const history = createVueRouterHistory(sdk);

    expect(history.location).toBe("/tx/42");
  });

  it("createHref delegates to sdk.router.link", () => {
    const { sdk, router } = createFakeSdk("/");
    const history = createVueRouterHistory(sdk);

    expect(history.createHref("/tx/42")).toBe("/h/f3k2xp/a/budget/tx/42");
    expect(router.link).toHaveBeenCalledWith("/tx/42");
  });

  it("push navigates via sdk.router.navigate and notifies listeners exactly once", () => {
    const { sdk, router } = createFakeSdk("/");
    const history = createVueRouterHistory(sdk);
    const listener = jest.fn();
    history.listen(listener);

    history.push("/tx/42");

    expect(router.navigate).toHaveBeenCalledWith("/tx/42");
    expect(history.location).toBe("/tx/42");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("/tx/42", "/", expect.objectContaining({ type: "push" }));
  });

  it("replace navigates with the replace option and notifies once", () => {
    const { sdk, router } = createFakeSdk("/");
    const history = createVueRouterHistory(sdk);
    const listener = jest.fn();
    history.listen(listener);

    history.replace("/accounts");

    expect(router.navigate).toHaveBeenCalledWith("/accounts", { replace: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      "/accounts",
      "/",
      expect.objectContaining({ type: "pop" }),
    );
  });

  it("notifies listeners on an external change (not push/replace)", () => {
    const { sdk, externalChange } = createFakeSdk("/");
    const history = createVueRouterHistory(sdk);
    const listener = jest.fn();
    history.listen(listener);

    externalChange("/tx/99");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("/tx/99", "/", expect.objectContaining({ type: "pop" }));
  });

  it("go(-1) delegates to sdk.router.back", () => {
    const { sdk, router } = createFakeSdk("/");
    const history = createVueRouterHistory(sdk);

    history.go(-1);

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("go(n) for n !== -1 falls back to window.history.go", () => {
    const goSpy = jest.spyOn(window.history, "go").mockImplementation(() => {});
    const { sdk } = createFakeSdk("/");
    const history = createVueRouterHistory(sdk);

    history.go(3);

    expect(goSpy).toHaveBeenCalledWith(3);
    goSpy.mockRestore();
  });

  it("listen returns an unsubscribe function", () => {
    const { sdk, externalChange } = createFakeSdk("/");
    const history = createVueRouterHistory(sdk);
    const listener = jest.fn();

    const unlisten = history.listen(listener);
    unlisten();
    externalChange("/tx/1");

    expect(listener).not.toHaveBeenCalled();
  });

  it("destroy clears all listeners", () => {
    const { sdk, externalChange } = createFakeSdk("/");
    const history = createVueRouterHistory(sdk);
    const listener = jest.fn();
    history.listen(listener);

    history.destroy();
    externalChange("/tx/1");

    expect(listener).not.toHaveBeenCalled();
  });
});
