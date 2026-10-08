import { createMemoryHistory, RouterHistory } from "@tanstack/react-router";
import { createSdkRouter } from "../createSdkRouter";

const APP_ID = "recipes";
const BASENAME = "/h/f3k2xp-semya-ivanovyh/a/recipes";

function historyAt(href: string): RouterHistory {
  const history = createMemoryHistory({ initialEntries: [href] });
  jest.spyOn(history, "push");
  jest.spyOn(history, "replace");
  return history;
}

describe("createSdkRouter", () => {
  it("reports location relative to the basename", () => {
    const sdkRouter = createSdkRouter(historyAt(`${BASENAME}/r/8421?servings=4#steps`), APP_ID);

    expect(sdkRouter.location).toEqual({
      pathname: "/r/8421",
      search: "?servings=4",
      hash: "#steps",
    });
  });

  it("reports / when the location is exactly the basename", () => {
    const sdkRouter = createSdkRouter(historyAt(BASENAME), APP_ID);

    expect(sdkRouter.location.pathname).toBe("/");
  });

  it("navigate pushes the absolute address into the host history as is", () => {
    const history = historyAt(BASENAME);
    const sdkRouter = createSdkRouter(history, APP_ID);

    sdkRouter.navigate("/r/8421?q=a+b&q=%22c%22");

    expect(history.push).toHaveBeenCalledWith(`${BASENAME}/r/8421?q=a+b&q=%22c%22`);
    expect(sdkRouter.location).toEqual({
      pathname: "/r/8421",
      search: "?q=a+b&q=%22c%22",
      hash: "",
    });
  });

  it("navigate with replace replaces the current entry", () => {
    const history = historyAt(BASENAME);
    const sdkRouter = createSdkRouter(history, APP_ID);

    sdkRouter.navigate("/shopping", { replace: true });

    expect(history.replace).toHaveBeenCalledWith(`${BASENAME}/shopping`);
    expect(history.push).not.toHaveBeenCalled();
  });

  it("navigate to / lands exactly on the basename, without a trailing segment", () => {
    const history = historyAt(`${BASENAME}/r/8421`);
    const sdkRouter = createSdkRouter(history, APP_ID);

    sdkRouter.navigate("/");

    expect(history.push).toHaveBeenCalledWith(BASENAME);
  });

  it("link returns an absolute URL for use in a real href", () => {
    expect(createSdkRouter(historyAt(BASENAME), APP_ID).link("/r/8421")).toBe(`${BASENAME}/r/8421`);
  });

  it("back() goes back in the host history", () => {
    const history = createMemoryHistory({ initialEntries: [BASENAME, `${BASENAME}/r/1`] });
    const sdkRouter = createSdkRouter(history, APP_ID);

    sdkRouter.back();

    expect(sdkRouter.location.pathname).toBe("/");
  });

  it("subscribe delivers the fresh relative location on every history change", () => {
    const history = historyAt(BASENAME);
    const sdkRouter = createSdkRouter(history, APP_ID);
    const listener = jest.fn();

    sdkRouter.subscribe(listener);
    history.push(`${BASENAME}/collections/9`);

    expect(listener).toHaveBeenCalledWith({ pathname: "/collections/9", search: "", hash: "" });
  });

  it("unsubscribe stops delivering further changes", () => {
    const history = historyAt(BASENAME);
    const sdkRouter = createSdkRouter(history, APP_ID);
    const listener = jest.fn();

    const unsubscribe = sdkRouter.subscribe(listener);
    unsubscribe();
    history.push(`${BASENAME}/collections/9`);

    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps resolving the correct basename after a hid-only route change (T15)", () => {
    const history = historyAt(`${BASENAME}/r/8421`);
    const sdkRouter = createSdkRouter(history, APP_ID);

    history.replace("/h/other-household/a/recipes/r/8421");

    expect(sdkRouter.location.pathname).toBe("/r/8421");
    expect(sdkRouter.link("/")).toBe("/h/other-household/a/recipes");
  });

  it("ignores navigate from an app the current route has moved past", () => {
    const history = historyAt("/h/f3k2xp-semya-ivanovyh/a/budget");
    const sdkRouter = createSdkRouter(history, APP_ID);

    sdkRouter.navigate("/", { replace: true });

    expect(history.push).not.toHaveBeenCalled();
    expect(history.replace).not.toHaveBeenCalled();
  });
});
