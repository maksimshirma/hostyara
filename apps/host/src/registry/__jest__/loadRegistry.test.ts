import { loadRegistry } from "../loadRegistry";

describe("loadRegistry", () => {
  it("registers every manifest from registry.json", () => {
    const registry = loadRegistry();

    expect(registry.get("recipes")?.manifest.id).toBe("recipes");
    expect(registry.get("budget")?.manifest.id).toBe("budget");
  });

  it("resolves a known app with a compatible contract", () => {
    const registry = loadRegistry();

    expect(registry.resolve("recipes")).toEqual({
      ok: true,
      manifest: expect.objectContaining({ id: "recipes" }),
    });
    expect(registry.resolve("budget")).toEqual({
      ok: true,
      manifest: expect.objectContaining({ id: "budget" }),
    });
  });

  it("returns a typed error for an app not present in registry.json", () => {
    const registry = loadRegistry();

    expect(registry.resolve("calendar")).toEqual({
      ok: false,
      error: { kind: "unknown-app", appId: "calendar" },
    });
  });
});
