import { HostRouter, HostRouterLocation } from "../createHostRouter";
import { createSdkRouter } from "../createSdkRouter";

function createFakeHostRouter(
  initial: HostRouterLocation,
): HostRouter & { setLocation(loc: HostRouterLocation): void } {
  let location = initial;
  const listeners = new Set<() => void>();

  return {
    getLocation: () => location,
    getRoute: () => ({ kind: "not-found" }),
    navigate: jest.fn((to: string) => {
      location = { pathname: to, search: "", hash: "" };
      for (const listener of listeners) listener();
    }),
    subscribe: jest.fn((callback: () => void) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    }),
    dispose: jest.fn(),
    setLocation(loc) {
      location = loc;
      for (const listener of listeners) listener();
    },
  };
}

const BASENAME = "/h/f3k2xp-semya-ivanovyh/a/recipes";

describe("createSdkRouter", () => {
  it("reports location relative to the basename", () => {
    const hostRouter = createFakeHostRouter({
      pathname: `${BASENAME}/r/8421`,
      search: "?servings=4",
      hash: "#steps",
    });
    const sdkRouter = createSdkRouter(hostRouter, BASENAME);

    expect(sdkRouter.location).toEqual({
      pathname: "/r/8421",
      search: "?servings=4",
      hash: "#steps",
    });
  });

  it("reports / when the location is exactly the basename", () => {
    const hostRouter = createFakeHostRouter({ pathname: BASENAME, search: "", hash: "" });
    const sdkRouter = createSdkRouter(hostRouter, BASENAME);

    expect(sdkRouter.location.pathname).toBe("/");
  });

  it("navigate converts a relative path to an absolute one before delegating to the host router", () => {
    const hostRouter = createFakeHostRouter({ pathname: BASENAME, search: "", hash: "" });
    const sdkRouter = createSdkRouter(hostRouter, BASENAME);

    sdkRouter.navigate("/r/8421");

    expect(hostRouter.navigate).toHaveBeenCalledWith(`${BASENAME}/r/8421`, undefined);
  });

  it("navigate passes the replace option through unchanged", () => {
    const hostRouter = createFakeHostRouter({ pathname: BASENAME, search: "", hash: "" });
    const sdkRouter = createSdkRouter(hostRouter, BASENAME);

    sdkRouter.navigate("/shopping", { replace: true });

    expect(hostRouter.navigate).toHaveBeenCalledWith(`${BASENAME}/shopping`, { replace: true });
  });

  it("navigate to / lands exactly on the basename, without a trailing segment", () => {
    const hostRouter = createFakeHostRouter({
      pathname: `${BASENAME}/r/8421`,
      search: "",
      hash: "",
    });
    const sdkRouter = createSdkRouter(hostRouter, BASENAME);

    sdkRouter.navigate("/");

    expect(hostRouter.navigate).toHaveBeenCalledWith(BASENAME, undefined);
  });

  it("link returns an absolute URL for use in a real href", () => {
    const hostRouter = createFakeHostRouter({ pathname: BASENAME, search: "", hash: "" });
    const sdkRouter = createSdkRouter(hostRouter, BASENAME);

    expect(sdkRouter.link("/r/8421")).toBe(`${BASENAME}/r/8421`);
  });

  it("back() delegates to window.history.back", () => {
    const backSpy = jest.spyOn(window.history, "back").mockImplementation(() => {});
    const hostRouter = createFakeHostRouter({ pathname: BASENAME, search: "", hash: "" });
    const sdkRouter = createSdkRouter(hostRouter, BASENAME);

    sdkRouter.back();

    expect(backSpy).toHaveBeenCalledTimes(1);
    backSpy.mockRestore();
  });

  it("subscribe delivers the fresh relative location on every host router change", () => {
    const hostRouter = createFakeHostRouter({ pathname: BASENAME, search: "", hash: "" });
    const sdkRouter = createSdkRouter(hostRouter, BASENAME);
    const listener = jest.fn();

    sdkRouter.subscribe(listener);
    hostRouter.setLocation({ pathname: `${BASENAME}/collections/9`, search: "", hash: "" });

    expect(listener).toHaveBeenCalledWith({ pathname: "/collections/9", search: "", hash: "" });
  });

  it("unsubscribe stops delivering further changes", () => {
    const hostRouter = createFakeHostRouter({ pathname: BASENAME, search: "", hash: "" });
    const sdkRouter = createSdkRouter(hostRouter, BASENAME);
    const listener = jest.fn();

    const unsubscribe = sdkRouter.subscribe(listener);
    unsubscribe();
    hostRouter.setLocation({ pathname: `${BASENAME}/collections/9`, search: "", hash: "" });

    expect(listener).not.toHaveBeenCalled();
  });
});
