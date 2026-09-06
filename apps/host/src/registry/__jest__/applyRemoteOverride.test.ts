import { AppManifest } from "@hostyara/contracts";
import { applyRemoteOverrides, parseRemoteOverrides } from "../applyRemoteOverride";

function fakeManifest(overrides: Partial<AppManifest> = {}): AppManifest {
  return {
    id: "recipes",
    name: "Recipes",
    version: "1.0.0",
    contract: "1",
    category: "food",
    tags: [],
    surfaces: {},
    permissions: [],
    entities: [],
    routes: ["/"],
    mount: {
      remoteEntry: "http://cdn.example.com/recipes/remoteEntry.js",
      exposed: "./app",
      styles: [],
    },
    network: { connect: [] },
    ...overrides,
  };
}

describe("parseRemoteOverrides", () => {
  it("returns an empty map when there is no _remote param", () => {
    expect(parseRemoteOverrides("").size).toBe(0);
    expect(parseRemoteOverrides("?other=1").size).toBe(0);
  });

  it("parses a single appId@url override", () => {
    const overrides = parseRemoteOverrides("?_remote=recipes@http://localhost:5174/remoteEntry.js");

    expect(overrides.get("recipes")).toBe("http://localhost:5174/remoteEntry.js");
  });

  it("parses multiple repeated _remote params", () => {
    const overrides = parseRemoteOverrides(
      "?_remote=recipes@http://localhost:5174/remoteEntry.js&_remote=budget@http://localhost:5175/remoteEntry.js",
    );

    expect(overrides.get("recipes")).toBe("http://localhost:5174/remoteEntry.js");
    expect(overrides.get("budget")).toBe("http://localhost:5175/remoteEntry.js");
  });

  it("ignores a malformed value with no appId or no url", () => {
    expect(parseRemoteOverrides("?_remote=@http://x").size).toBe(0);
    expect(parseRemoteOverrides("?_remote=recipes@").size).toBe(0);
    expect(parseRemoteOverrides("?_remote=recipes-no-separator").size).toBe(0);
  });
});

describe("applyRemoteOverrides", () => {
  it("returns the same manifests unchanged when there are no overrides", () => {
    const manifests = [fakeManifest()];

    expect(applyRemoteOverrides(manifests, new Map())).toBe(manifests);
  });

  it("overrides only the mount.remoteEntry of the matching manifest", () => {
    const manifests = [fakeManifest({ id: "recipes" }), fakeManifest({ id: "budget" })];
    const overrides = new Map([["recipes", "http://localhost:5174/remoteEntry.js"]]);

    const result = applyRemoteOverrides(manifests, overrides);

    expect(result[0].mount.remoteEntry).toBe("http://localhost:5174/remoteEntry.js");
    expect(result[0].mount.exposed).toBe(manifests[0].mount.exposed);
    expect(result[1]).toBe(manifests[1]);
  });
});
