import { createFakeManifest, createFakeRegistry, createFakeSdk } from "../fixtures";

describe("createFakeManifest", () => {
  it("produces a manifest that resolves against the real registry", () => {
    const registry = createFakeRegistry([createFakeManifest({ id: "widget" })]);

    const result = registry.resolve("widget");

    expect(result).toMatchObject({ ok: true, manifest: { id: "widget" } });
  });

  it("applies overrides on top of the defaults", () => {
    const manifest = createFakeManifest({ id: "custom", name: "Custom" });

    expect(manifest.id).toBe("custom");
    expect(manifest.name).toBe("Custom");
  });
});

describe("createFakeRegistry", () => {
  it("defaults to a single resolvable manifest when given no arguments", () => {
    const registry = createFakeRegistry();

    expect(registry.resolve("widget")).toMatchObject({ ok: true });
  });
});

describe("createFakeSdk", () => {
  it("satisfies the full HostSDK shape and accepts overrides", () => {
    const navigate = jest.fn();
    const sdk = createFakeSdk({ router: { ...createFakeSdk().router, navigate } });

    sdk.router.navigate("/x");

    expect(navigate).toHaveBeenCalledWith("/x");
    expect(sdk.mode).toBe("household");
  });
});
