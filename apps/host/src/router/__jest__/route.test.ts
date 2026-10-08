import {
  buildAppPath,
  computeBasename,
  parseRoute,
  RESERVED_ROOT_SEGMENTS,
  RESERVED_SPACE_SEGMENTS,
  Route,
  routeZone,
} from "../route";

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

  it.each([
    ["catalog", { kind: "catalog" }],
    ["inbox", { kind: "inbox" }],
    ["search", { kind: "search" }],
    ["settings", { kind: "settings", section: null }],
  ])("resolves the reserved %s area instead of treating it as an appId", (segment, area) => {
    expect(parseRoute(`/h/f3k2xp/${segment}`)).toEqual({
      kind: "space",
      hid: "f3k2xp",
      hidSegment: "f3k2xp",
      area,
    });
  });

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

  it("returns not-found for an unknown root segment", () => {
    expect(parseRoute("/en")).toEqual({ kind: "not-found" });
    expect(parseRoute("/whatever/deep")).toEqual({ kind: "not-found" });
  });
});

describe("parseRoute: IA §4 shell routes", () => {
  const space = (area: object) => ({ kind: "space", hid: "f3k2xp", hidSegment: "f3k2xp", area });

  it.each<[string, Route | object]>([
    ["/", { kind: "root" }],
    ["/login", { kind: "login" }],
    ["/signup", { kind: "signup" }],
    ["/invite/tk9", { kind: "invite", token: "tk9" }],
    ["/s/9fKq2m", { kind: "share", token: "9fKq2m" }],
    ["/s/9fKq2m/pasta-carbonara", { kind: "share", token: "9fKq2m", slug: "pasta-carbonara" }],
    ["/account", { kind: "account", section: "profile" }],
    ["/account/security", { kind: "account", section: "security" }],
    ["/account/sessions", { kind: "account", section: "sessions" }],
    ["/spaces", { kind: "spaces", section: "list" }],
    ["/spaces/new", { kind: "spaces", section: "new" }],
    ["/h/f3k2xp/search", space({ kind: "search" })],
    ["/h/f3k2xp/inbox/ev1", space({ kind: "inbox", eventId: "ev1" })],
    ["/h/f3k2xp/catalog/recipes", space({ kind: "catalog", appId: "recipes" })],
    ["/h/f3k2xp/settings/general", space({ kind: "settings", section: "general" })],
    ["/h/f3k2xp/settings/members", space({ kind: "settings", section: "members" })],
    [
      "/h/f3k2xp/settings/members/m1",
      space({ kind: "settings", section: "members", itemId: "m1" }),
    ],
    ["/h/f3k2xp/settings/apps", space({ kind: "settings", section: "apps" })],
    [
      "/h/f3k2xp/settings/apps/recipes",
      space({ kind: "settings", section: "apps", itemId: "recipes" }),
    ],
    ["/h/f3k2xp/settings/notifications", space({ kind: "settings", section: "notifications" })],
    ["/h/f3k2xp/settings/shared", space({ kind: "settings", section: "shared" })],
    ["/h/f3k2xp/settings/data", space({ kind: "settings", section: "data" })],
    ["/dev/registry", { kind: "dev", section: "registry" }],
    ["/dev/registry/recipes", { kind: "dev", section: "registry", appId: "recipes" }],
    ["/dev/health", { kind: "dev", section: "health" }],
  ])("parses %s", (pathname, expected) => {
    expect(parseRoute(pathname)).toEqual(expected);
  });

  it("tolerates a trailing slash", () => {
    expect(parseRoute("/account/security/")).toEqual({ kind: "account", section: "security" });
  });

  it.each([
    "/login/extra",
    "/invite",
    "/invite/a/b",
    "/s",
    "/s/a/b/c",
    "/account/unknown",
    "/account/security/extra",
    "/spaces/other",
    "/h",
    "/h/f3k2xp/search/extra",
    "/h/f3k2xp/inbox/ev1/extra",
    "/h/f3k2xp/catalog/recipes/extra",
    "/h/f3k2xp/settings/unknown",
    "/h/f3k2xp/settings/general/extra",
    "/h/f3k2xp/settings/members/m1/extra",
    "/dev",
    "/dev/health/extra",
    "/dev/unknown",
  ])("returns not-found for %s", (pathname) => {
    expect(parseRoute(pathname)).toEqual({ kind: "not-found" });
  });
});

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
    expect(routeZone(parseRoute(pathname))).toBe(zone);
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
