import { AppManifest } from "@hostyara/contract";
import { AppRegistry } from "./index";

describe("AppRegistry", () => {
  const manifest: AppManifest = {
    id: "app1",
    name: "Example App",
    remoteEntryUrl: "https://example.com/remoteEntry.js",
    routes: ["/example"],
    version: "1.0.0",
    permissions: [],
    featureFlags: [],
    status: "healthy",
  };

  it("registers and retrieves an app manifest", () => {
    const registry = new AppRegistry();
    registry.register(manifest);

    expect(registry.get("app1")).toEqual(manifest);
    expect(registry.list()).toEqual([manifest]);
  });

  it("updates app status", () => {
    const registry = new AppRegistry();
    registry.register(manifest);
    registry.updateStatus("app1", "down");

    expect(registry.get("app1")?.status).toBe("down");
  });

  it("unregisters an app", () => {
    const registry = new AppRegistry();
    registry.register(manifest);
    registry.unregister("app1");

    expect(registry.get("app1")).toBeUndefined();
    expect(registry.list()).toEqual([]);
  });
});
