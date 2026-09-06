import { buildAppPath, computeBasename, parseRoute, RESERVED_SPACE_SEGMENTS } from "../route";

describe("parseRoute", () => {
  it("parses the canonical app path with a slugged hid tail", () => {
    const route = parseRoute("/h/f3k2xp-semya-ivanovyh/a/recipes/r/8421/pasta-carbonara");

    expect(route).toEqual({
      kind: "space",
      hid: "f3k2xp",
      hidSegment: "f3k2xp-semya-ivanovyh",
      area: {
        kind: "app",
        appId: "recipes",
        appPath: "/r/8421/pasta-carbonara",
        basename: "/h/f3k2xp-semya-ivanovyh/a/recipes",
      },
    });
  });

  it("parses a bare hid the same way as the tailed form", () => {
    const route = parseRoute("/h/f3k2xp/a/recipes");

    expect(route).toMatchObject({ hid: "f3k2xp", hidSegment: "f3k2xp" });
  });

  it("resolves the space home when no app segment follows the hid", () => {
    expect(parseRoute("/h/f3k2xp-semya-ivanovyh")).toEqual({
      kind: "space",
      hid: "f3k2xp",
      hidSegment: "f3k2xp-semya-ivanovyh",
      area: { kind: "home" },
    });
  });

  it.each(["catalog", "inbox", "search", "settings"])(
    "resolves the reserved %s area instead of treating it as an appId",
    (segment) => {
      const route = parseRoute(`/h/f3k2xp/${segment}`);
      expect(route).toEqual({
        kind: "space",
        hid: "f3k2xp",
        hidSegment: "f3k2xp",
        area: { kind: segment },
      });
    },
  );

  it("never resolves a reserved segment as an app area", () => {
    for (const segment of RESERVED_SPACE_SEGMENTS) {
      const route = parseRoute(`/h/f3k2xp/${segment}`);
      const isAppArea = route.kind === "space" && route.area.kind === "app";
      expect(isAppArea).toBe(false);
    }
  });

  it("returns not-found for /a/:appId without an app id", () => {
    expect(parseRoute("/h/f3k2xp/a")).toEqual({ kind: "not-found" });
  });

  it("returns not-found for an unrecognized area", () => {
    expect(parseRoute("/h/f3k2xp/something-else")).toEqual({ kind: "not-found" });
  });

  it("returns not-found outside the /h/:hid scheme", () => {
    expect(parseRoute("/")).toEqual({ kind: "not-found" });
    expect(parseRoute("/account")).toEqual({ kind: "not-found" });
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
