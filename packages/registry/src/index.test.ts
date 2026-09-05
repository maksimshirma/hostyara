import { AppManifest } from "@hostyara/contracts";
import { AppRegistry } from "./index";

describe("AppRegistry", () => {
  const manifest: AppManifest = {
    id: "app1",
    name: "Example App",
    version: "1.0.0",
    contract: "1",
    category: "Кухня",
    tags: ["еда"],
    surfaces: { search: true },
    permissions: [],
    entities: [{ type: "recipe", route: "/r/:id/:slug" }],
    routes: ["/example"],
    mount: {
      remoteEntry: "https://example.com/remoteEntry.js",
      exposed: "./app",
      styles: ["https://example.com/app.css"],
    },
    network: { connect: ["https://api.example.com"] },
  };

  it("registers and retrieves an app manifest", () => {
    const registry = new AppRegistry();
    registry.register(manifest);

    expect(registry.get("app1")?.manifest).toEqual(manifest);
    expect(registry.list().map((entry) => entry.manifest)).toEqual([manifest]);
  });

  it("unregisters an app", () => {
    const registry = new AppRegistry();
    registry.register(manifest);
    registry.unregister("app1");

    expect(registry.get("app1")).toBeUndefined();
    expect(registry.list()).toEqual([]);
  });
});
