import { parseRoute } from "../route";
import { FROM_PARAM, paths } from "../paths";

describe("paths", () => {
  it.each([
    [paths.root(), "/"],
    [paths.login(), "/login"],
    [paths.signup(), "/signup"],
    [paths.invite("tk9"), "/invite/tk9"],
    [paths.share("9fKq2m"), "/s/9fKq2m"],
    [paths.share("9fKq2m", "pasta"), "/s/9fKq2m/pasta"],
    [paths.account(), "/account"],
    [paths.account("security"), "/account/security"],
    [paths.spaces(), "/spaces"],
    [paths.newSpace(), "/spaces/new"],
    [paths.space("f3k2xp-semya"), "/h/f3k2xp-semya"],
    [paths.search("f3k2xp"), "/h/f3k2xp/search"],
    [paths.inbox("f3k2xp"), "/h/f3k2xp/inbox"],
    [paths.inbox("f3k2xp", "ev1"), "/h/f3k2xp/inbox/ev1"],
    [paths.catalog("f3k2xp"), "/h/f3k2xp/catalog"],
    [paths.catalog("f3k2xp", "recipes"), "/h/f3k2xp/catalog/recipes"],
    [paths.settings("f3k2xp"), "/h/f3k2xp/settings/general"],
    [paths.settings("f3k2xp", "members", "m1"), "/h/f3k2xp/settings/members/m1"],
    [paths.app("f3k2xp", "recipes", "/r/8421"), "/h/f3k2xp/a/recipes/r/8421"],
    [paths.devRegistry(), "/dev/registry"],
    [paths.devRegistry("recipes"), "/dev/registry/recipes"],
    [paths.devHealth(), "/dev/health"],
  ])("builds %s", (built, expected) => {
    expect(built).toBe(expected);
  });

  it("never builds a path that parseRoute rejects", () => {
    const built = [
      paths.root(),
      paths.login(),
      paths.signup(),
      paths.invite("t"),
      paths.share("t", "s"),
      paths.account("sessions"),
      paths.spaces(),
      paths.newSpace(),
      paths.space("f3k2xp"),
      paths.search("f3k2xp"),
      paths.inbox("f3k2xp", "e"),
      paths.catalog("f3k2xp", "recipes"),
      paths.settings("f3k2xp", "apps", "recipes"),
      paths.app("f3k2xp", "recipes"),
      paths.devRegistry("recipes"),
      paths.devHealth(),
    ];
    for (const path of built) {
      expect(parseRoute(path).kind).not.toBe("not-found");
    }
  });

  it("carries the original address through the login screen in _from", () => {
    const url = new URL(paths.login({ from: "/h/f3k2xp/a/recipes?x=1" }), "http://host");
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get(FROM_PARAM)).toBe("/h/f3k2xp/a/recipes?x=1");
  });
});
