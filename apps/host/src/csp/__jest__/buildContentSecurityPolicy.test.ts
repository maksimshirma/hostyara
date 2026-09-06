import { AppManifest } from "@hostyara/contracts";
import { buildContentSecurityPolicy } from "../buildContentSecurityPolicy";

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
      remoteEntry: "https://cdn.example.com/recipes/remoteEntry.js",
      exposed: "./app",
      styles: ["https://cdn.example.com/recipes/app.css"],
    },
    network: { connect: [] },
    ...overrides,
  };
}

function directive(policy: string, name: string): string[] {
  const match = policy.split("; ").find((entry) => entry.startsWith(`${name} `));
  return match ? match.slice(name.length + 1).split(" ") : [];
}

describe("buildContentSecurityPolicy", () => {
  it("includes 'self' as the baseline for every directive with no apps installed", () => {
    const policy = buildContentSecurityPolicy([]);

    expect(directive(policy, "default-src")).toEqual(["'self'"]);
    expect(directive(policy, "script-src")).toEqual(["'self'"]);
    expect(directive(policy, "style-src")).toEqual(
      expect.arrayContaining(["'self'", "'unsafe-inline'"]),
    );
    expect(directive(policy, "connect-src")).toEqual(["'self'"]);
    expect(directive(policy, "frame-src")).toEqual(["'self'"]);
  });

  it("adds the remote's origin to script-src and connect-src", () => {
    const policy = buildContentSecurityPolicy([fakeManifest()]);

    expect(directive(policy, "script-src")).toContain("https://cdn.example.com");
    expect(directive(policy, "connect-src")).toContain("https://cdn.example.com");
  });

  it("adds the remote's origin to frame-src, for the iframe transport (T16/T17)", () => {
    const policy = buildContentSecurityPolicy([fakeManifest()]);

    // frame-src falls back to default-src ('self') when omitted, which
    // would otherwise silently block a mount.type: "iframe" app.
    expect(directive(policy, "frame-src")).toContain("https://cdn.example.com");
  });

  it("adds each style's origin to style-src and connect-src", () => {
    const policy = buildContentSecurityPolicy([
      fakeManifest({
        mount: {
          remoteEntry: "https://cdn.example.com/recipes/remoteEntry.js",
          exposed: "./app",
          styles: ["https://styles.example.com/app.css"],
        },
      }),
    ]);

    expect(directive(policy, "style-src")).toContain("https://styles.example.com");
    expect(directive(policy, "connect-src")).toContain("https://styles.example.com");
  });

  it("unions network.connect across every installed app into connect-src", () => {
    const policy = buildContentSecurityPolicy([
      fakeManifest({ id: "recipes", network: { connect: ["https://api-recipes.example.com"] } }),
      fakeManifest({ id: "budget", network: { connect: ["https://api-budget.example.com"] } }),
    ]);

    const connectSrc = directive(policy, "connect-src");
    expect(connectSrc).toContain("https://api-recipes.example.com");
    expect(connectSrc).toContain("https://api-budget.example.com");
  });

  it("deduplicates repeated origins across manifests", () => {
    const policy = buildContentSecurityPolicy([
      fakeManifest({ id: "recipes" }),
      fakeManifest({ id: "recipes-iframe" }),
    ]);

    const scriptSrc = directive(policy, "script-src");
    expect(scriptSrc.filter((entry) => entry === "https://cdn.example.com")).toHaveLength(1);
  });

  it("does not add anything for an undeclared domain an app never listed", () => {
    const policy = buildContentSecurityPolicy([fakeManifest()]);

    expect(policy).not.toContain("evil.example.com");
  });
});
