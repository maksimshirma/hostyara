import { buildAppPath, computeBasename, RESERVED_ROOT_SEGMENTS, routeZone } from "../route";
import { routeForPath } from "../hostRoute";

describe("routeZone", () => {
  it.each<[string, string]>([
    ["/login", "public"],
    ["/signup", "public"],
    ["/invite/t", "public"],
    ["/s/t", "public"],
    ["/nowhere", "public"],
    ["/", "personal"],
    ["/account", "personal"],
    ["/spaces/new", "personal"],
    ["/h/f3k2xp", "space"],
    ["/h/f3k2xp/a/recipes", "space"],
    ["/dev/health", "platform"],
  ])("classifies %s as %s", (pathname, zone) => {
    expect(routeZone(routeForPath(pathname))).toBe(zone);
  });
});

describe("RESERVED_ROOT_SEGMENTS", () => {
  // IA инвариант 6: корень делится с языковыми кодами маркетинга.
  it("never matches the shape of a language code", () => {
    for (const segment of RESERVED_ROOT_SEGMENTS) {
      expect(segment).not.toMatch(/^[a-z]{2}(-[a-z]{2})?$/);
    }
  });
});

describe("computeBasename", () => {
  it("builds the shell-owned prefix up to and including the appId", () => {
    expect(computeBasename("f3k2xp-semya-ivanovyh", "recipes")).toBe(
      "/h/f3k2xp-semya-ivanovyh/a/recipes",
    );
  });
});

describe("buildAppPath", () => {
  it("appends the app-owned tail to the basename", () => {
    expect(buildAppPath("f3k2xp-semya-ivanovyh", "recipes", "/r/8421")).toBe(
      "/h/f3k2xp-semya-ivanovyh/a/recipes/r/8421",
    );
  });

  it("omits the tail when the app path is the app's own root", () => {
    expect(buildAppPath("f3k2xp", "recipes")).toBe("/h/f3k2xp/a/recipes");
    expect(buildAppPath("f3k2xp", "recipes", "/")).toBe("/h/f3k2xp/a/recipes");
  });
});
