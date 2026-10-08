import { createAppRouter } from "../appRouter";
import { appMountRoute } from "../routes";
import { createSdkRouter } from "../createSdkRouter";
import { installDevHistoryGuard } from "../historyGuard";
import { createHostHistory } from "../hostHistory";

const BASENAME = "/h/f3k2xp-semya/a/recipes";

function setLocation(href: string): void {
  window.history.replaceState(null, "", href);
}

describe("createHostHistory", () => {
  afterEach(() => setLocation("/"));

  it("writes window.history synchronously and keys every entry", () => {
    setLocation("/h/f3k2xp-semya");
    const history = createHostHistory();
    const firstKey = history.location.state.__TSR_key;

    history.push("/h/f3k2xp-semya/search?q=a+b");

    expect(`${window.location.pathname}${window.location.search}`).toBe(
      "/h/f3k2xp-semya/search?q=a+b",
    );
    expect(history.location.state.__TSR_index).toBe(1);
    expect(history.location.state.__TSR_key).not.toBe(firstKey);
    history.destroy();
  });

  it("reports browser traversals once the browser has moved", () => {
    setLocation("/h/f3k2xp-semya");
    const history = createHostHistory();
    history.push("/h/f3k2xp-semya/inbox");
    const listener = jest.fn();
    history.subscribe(listener);

    window.history.replaceState({ __TSR_index: 0, __TSR_key: "k0" }, "", "/h/f3k2xp-semya");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ action: { type: "BACK" } }));
    expect(history.location.pathname).toBe("/h/f3k2xp-semya");
    history.destroy();
  });

  it("is the host's own writer for the dev history guard", () => {
    setLocation(BASENAME);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const uninstall = installDevHistoryGuard(() => "recipes");
    const history = createHostHistory();

    history.push(`${BASENAME}/r/1`);
    history.replace(`${BASENAME}/r/2`);
    expect(warn).not.toHaveBeenCalled();

    window.history.pushState(null, "", "/elsewhere");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('app "recipes"'));

    uninstall();
    warn.mockRestore();
    history.destroy();
  });
});

describe("sdk.router over the host history", () => {
  afterEach(() => setLocation("/"));

  it("reflects a navigate in location immediately", () => {
    setLocation(BASENAME);
    const history = createHostHistory();
    const sdkRouter = createSdkRouter(history, "recipes");

    sdkRouter.navigate("/r/8421?servings=4");

    expect(sdkRouter.location).toEqual({ pathname: "/r/8421", search: "?servings=4", hash: "" });
    expect(window.location.pathname).toBe(`${BASENAME}/r/8421`);
    history.destroy();
  });
});

describe("TanStack Router over the host history", () => {
  afterEach(() => setLocation("/"));

  it.each([
    "?servings=4&tag=%22a%22&q=a+b",
    "?q=a%20b&q=c&flag",
    "?x=001&y=true&z=%7Bjson%7D",
    "?tag=%D0%B5%D0%B4%D0%B0&_debug=1",
  ])("rebuilds %s byte for byte, so it never rewrites an app's query", async (search) => {
    setLocation(`${BASENAME}/r/8421${search}#steps`);
    const router = createAppRouter(createHostHistory());
    await router.load();

    // What the Transitioner compares on mount to decide whether to
    // replace the URL with a normalized one.
    const rebuilt = router.buildLocation({
      to: router.latestLocation.pathname,
      search: true,
      params: true,
      hash: true,
      state: true,
      _includeValidateSearch: true,
    });

    expect(rebuilt.publicHref).toBe(`${BASENAME}/r/8421${search}#steps`);
    expect(router.state.matches.at(-1)?.routeId).toBe(appMountRoute.id);
    router.history.destroy();
  });
});
