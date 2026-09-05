import { AppManifest, AppModule, HostSDK } from "@hostyara/contracts";
import { createMountManager } from "../createMountManager";

const manifest: AppManifest = {
  id: "recipes",
  name: "Рецепты",
  version: "1.0.0",
  contract: "1",
  category: "Кухня",
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
};

const sdk = {} as HostSDK;

function createAppModule(): AppModule & { mount: jest.Mock; unmount: jest.Mock } {
  return {
    mount: jest.fn(),
    unmount: jest.fn(),
  };
}

beforeEach(() => {
  global.fetch = jest.fn(
    (input: RequestInfo | URL) =>
      Promise.resolve({ text: () => Promise.resolve(`/* ${input} */`) }) as never,
  );
});

describe("createMountManager", () => {
  it("creates a host element with data-app and an open shadow root", async () => {
    const manager = createMountManager("/tokens.css");
    const slot = document.createElement("div");
    const appModule = createAppModule();

    await manager.mount(slot, manifest, appModule, sdk);

    const host = slot.firstElementChild as HTMLElement;
    expect(host.dataset.app).toBe("recipes");
    expect(host.shadowRoot?.mode).toBe("open");
  });

  it("applies the platform tokens and manifest styles before calling mount", async () => {
    const manager = createMountManager("/tokens.css");
    const slot = document.createElement("div");
    const appModule = createAppModule();

    appModule.mount.mockImplementation((el: HTMLElement) => {
      const root = el.getRootNode() as ShadowRoot;
      const styleTexts = Array.from(root.querySelectorAll("style")).map((s) => s.textContent);
      expect(styleTexts).toEqual([
        "/* /tokens.css */",
        "/* https://cdn.example.com/recipes/app.css */",
      ]);
    });

    await manager.mount(slot, manifest, appModule, sdk);

    expect(appModule.mount).toHaveBeenCalledTimes(1);
  });

  it("mounts the AppModule on a container inside the shadow root", async () => {
    const manager = createMountManager("/tokens.css");
    const slot = document.createElement("div");
    const appModule = createAppModule();

    await manager.mount(slot, manifest, appModule, sdk);

    const host = slot.firstElementChild as HTMLElement;
    const [el, receivedSdk] = appModule.mount.mock.calls[0];
    expect(host.shadowRoot?.contains(el)).toBe(true);
    expect(receivedSdk).toBe(sdk);
  });

  it("does not touch document.head", async () => {
    const manager = createMountManager("/tokens.css");
    const slot = document.createElement("div");
    const appModule = createAppModule();
    const headChildrenBefore = document.head.children.length;

    await manager.mount(slot, manifest, appModule, sdk);

    expect(document.head.children.length).toBe(headChildrenBefore);
  });

  it("relocates a stylesheet a remote's own runtime injects into document.head during mount", async () => {
    const manager = createMountManager("/tokens.css");
    const slot = document.createElement("div");
    const appModule = createAppModule();
    const headChildrenBefore = document.head.children.length;

    appModule.mount.mockImplementation(() => {
      const stray = document.createElement("link");
      stray.rel = "stylesheet";
      stray.href = "https://cdn.example.com/recipes/stray.css";
      document.head.append(stray);
    });

    await manager.mount(slot, manifest, appModule, sdk);

    expect(document.head.children.length).toBe(headChildrenBefore);
    const host = slot.firstElementChild as HTMLElement;
    const relocated = host.shadowRoot?.querySelector('link[rel="stylesheet"]');
    expect(relocated?.getAttribute("href")).toBe("https://cdn.example.com/recipes/stray.css");
  });

  it("caches stylesheet text by URL across mounts", async () => {
    const manager = createMountManager("/tokens.css");

    await manager.mount(document.createElement("div"), manifest, createAppModule(), sdk);
    await manager.mount(document.createElement("div"), manifest, createAppModule(), sdk);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledWith("/tokens.css");
    expect(global.fetch).toHaveBeenCalledWith("https://cdn.example.com/recipes/app.css");
  });

  it("unmounts the AppModule and removes the host element from the slot", async () => {
    const manager = createMountManager("/tokens.css");
    const slot = document.createElement("div");
    const appModule = createAppModule();

    await manager.mount(slot, manifest, appModule, sdk);
    await manager.unmount(slot);

    expect(appModule.unmount).toHaveBeenCalledTimes(1);
    expect(slot.children.length).toBe(0);
  });

  it("does nothing when unmounting a slot with no mounted app", async () => {
    const manager = createMountManager("/tokens.css");
    const slot = document.createElement("div");

    await expect(manager.unmount(slot)).resolves.toBeUndefined();
  });
});
