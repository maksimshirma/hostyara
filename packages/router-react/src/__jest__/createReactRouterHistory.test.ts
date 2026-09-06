import { HostSDK } from "@hostyara/contracts";
import { NavigationType } from "react-router-dom";
import { createReactRouterHistory } from "../createReactRouterHistory";

function createFakeSdk(initialPathname: string) {
  let location = { pathname: initialPathname, search: "", hash: "" };
  const listeners = new Set<() => void>();

  const router = {
    get location() {
      return location;
    },
    navigate: jest.fn((to: string) => {
      location = { pathname: to, search: "", hash: "" };
      for (const listener of listeners) listener();
    }),
    back: jest.fn(),
    subscribe: jest.fn((callback: () => void) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    }),
    link: jest.fn((to: string) => `/h/f3k2xp/a/recipes${to === "/" ? "" : to}`),
  };

  const sdk = { router } as unknown as HostSDK;
  return {
    sdk,
    router,
    externalChange: (pathname: string) => {
      location = { pathname, search: "", hash: "" };
      for (const listener of listeners) listener();
    },
  };
}

describe("createReactRouterHistory", () => {
  it("reports the current sdk.router location", () => {
    const { sdk } = createFakeSdk("/r/8421");
    const history = createReactRouterHistory(sdk);

    expect(history.location.pathname).toBe("/r/8421");
    expect(history.action).toBe(NavigationType.Pop);
  });

  it("createHref delegates to sdk.router.link", () => {
    const { sdk, router } = createFakeSdk("/");
    const history = createReactRouterHistory(sdk);

    expect(history.createHref("/r/8421")).toBe("/h/f3k2xp/a/recipes/r/8421");
    expect(router.link).toHaveBeenCalledWith("/r/8421");
  });

  it("createURL builds a URL from createHref", () => {
    const { sdk } = createFakeSdk("/");
    const history = createReactRouterHistory(sdk);

    expect(history.createURL("/r/8421").pathname).toBe("/h/f3k2xp/a/recipes/r/8421");
  });

  it("push navigates via sdk.router.navigate and notifies listeners exactly once with PUSH", () => {
    const { sdk, router } = createFakeSdk("/");
    const history = createReactRouterHistory(sdk);
    const listener = jest.fn();
    history.listen(listener);

    history.push("/r/8421");

    expect(router.navigate).toHaveBeenCalledWith("/r/8421");
    expect(history.action).toBe(NavigationType.Push);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        action: NavigationType.Push,
        location: expect.objectContaining({ pathname: "/r/8421" }),
      }),
    );
  });

  it("replace navigates with the replace option and notifies with REPLACE", () => {
    const { sdk, router } = createFakeSdk("/");
    const history = createReactRouterHistory(sdk);
    const listener = jest.fn();
    history.listen(listener);

    history.replace("/shopping");

    expect(router.navigate).toHaveBeenCalledWith("/shopping", { replace: true });
    expect(history.action).toBe(NavigationType.Replace);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].action).toBe(NavigationType.Replace);
  });

  it("notifies listeners with POP when the change comes from outside (not push/replace)", () => {
    const { sdk, externalChange } = createFakeSdk("/");
    const history = createReactRouterHistory(sdk);
    const listener = jest.fn();
    history.listen(listener);

    externalChange("/r/9999");

    expect(history.action).toBe(NavigationType.Pop);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].action).toBe(NavigationType.Pop);
  });

  it("go(-1) delegates to sdk.router.back", () => {
    const { sdk, router } = createFakeSdk("/");
    const history = createReactRouterHistory(sdk);

    history.go(-1);

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("go(n) for n !== -1 falls back to window.history.go", () => {
    const goSpy = jest.spyOn(window.history, "go").mockImplementation(() => {});
    const { sdk } = createFakeSdk("/");
    const history = createReactRouterHistory(sdk);

    history.go(2);

    expect(goSpy).toHaveBeenCalledWith(2);
    goSpy.mockRestore();
  });

  it("listen returns an unsubscribe function", () => {
    const { sdk, externalChange } = createFakeSdk("/");
    const history = createReactRouterHistory(sdk);
    const listener = jest.fn();

    const unlisten = history.listen(listener);
    unlisten();
    externalChange("/r/1");

    expect(listener).not.toHaveBeenCalled();
  });
});
