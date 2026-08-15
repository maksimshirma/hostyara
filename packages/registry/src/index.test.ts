import { AppManifest } from "@hostyara/contracts";
import { AppRegistry } from "./index";

describe("AppRegistry", () => {
  const manifest: AppManifest = {
    id: "app1",
    name: "Example App",
    namespace: "example",
    routes: ["/example"],
    version: "1.0.0",
    remote: {
      kind: "module-federation",
      remoteEntryUrl: "https://example.com/remoteEntry.js",
      scope: "example",
      module: "./App",
    },
    permissions: [],
    featureFlags: [],
    status: "healthy",
  };

  it("registers and retrieves an app manifest", () => {
    const registry = new AppRegistry();
    registry.register(manifest);

    expect(registry.get("app1")?.manifest).toEqual(manifest);
    expect(registry.list().map((entry) => entry.manifest)).toEqual([manifest]);
  });

  it("updates app status", () => {
    const registry = new AppRegistry();
    registry.register(manifest);
    registry.updateStatus("app1", "down");

    expect(registry.get("app1")?.manifest.status).toBe("down");
  });

  it("unregisters an app", () => {
    const registry = new AppRegistry();
    registry.register(manifest);
    registry.unregister("app1");

    expect(registry.get("app1")).toBeUndefined();
    expect(registry.list()).toEqual([]);
  });
});
