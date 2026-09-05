import {
  AppManifest,
  HostChannel,
  HostContext,
  HostSDK,
  IframeRemote,
  MfeModule,
  ModuleFederationRemote,
  MountContext,
  RegistryEntry,
  SharedStateAccessor,
  User,
} from "./index";

describe("@hostyara/contracts", () => {
  const user: User = { id: "u1", name: "Ada", email: "ada@example.com" };

  let state: Record<string, unknown> = {};
  const sharedState: SharedStateAccessor<Record<string, unknown>> = {
    get: () => state,
    subscribe: () => () => {},
    set: (patch) => {
      state = { ...state, ...patch };
    },
  };

  const sdk: HostSDK = {
    auth: { getUser: () => user, isAuthenticated: () => true },
    navigation: { navigate: () => {}, getCurrentRoute: () => "/" },
    notifications: { show: () => {} },
    featureFlags: { isEnabled: () => false },
    permissions: { hasPermission: () => true },
    sharedState,
    events: { request: async () => undefined, on: () => () => {} } as HostChannel,
  };

  it("composes a HostSDK from typed capability interfaces", () => {
    expect(sdk.auth.getUser()).toBe(user);
    expect(sdk.sharedState.get()).toEqual({});
  });

  it("applies controlled mutations through the shared state accessor", () => {
    sdk.sharedState.set({ theme: "dark" });
    expect(sdk.sharedState.get()).toEqual({ theme: "dark" });
  });

  it("supports both module-federation and iframe remotes in an AppManifest", () => {
    const mfRemote: ModuleFederationRemote = {
      kind: "module-federation",
      remoteEntryUrl: "https://example.com/remoteEntry.js",
      scope: "example",
      module: "./App",
    };
    const iframeRemote: IframeRemote = {
      kind: "iframe",
      entryUrl: "https://example.com/",
      sandbox: ["allow-scripts"],
    };

    const manifest: AppManifest = {
      id: "app1",
      name: "Example App",
      namespace: "example",
      routes: ["/example"],
      version: "1.0.0",
      remote: mfRemote,
      permissions: ["read"],
      featureFlags: ["new-ui"],
      status: "healthy",
    };

    expect(manifest.remote.kind).toBe("module-federation");
    expect(iframeRemote.kind).toBe("iframe");

    const entry: RegistryEntry = { manifest, registeredAt: new Date().toISOString() };
    expect(entry.manifest.id).toBe("app1");
  });

  it("builds a MountContext consumed by an MfeModule lifecycle", async () => {
    const hostContext: HostContext = { userId: user.id, permissions: ["read"] };
    const context: MountContext = {
      container: document.createElement("div"),
      hostContext,
      sdk,
    };

    const mfeModule: MfeModule = {
      bootstrap: async () => {},
      mount: async (ctx) => {
        ctx.container.textContent = "mounted";
      },
      unmount: async () => {},
      update: async () => {},
      prefetch: async () => {},
      destroy: async () => {},
    };

    await mfeModule.mount(context);
    expect(context.container.textContent).toBe("mounted");
  });

  it("supports typed request/on on a HostChannel", async () => {
    const handlers = new Map<string, (payload: unknown) => unknown>();
    const channel: HostChannel = {
      request: (method: string, payload?: unknown) => {
        const handler = handlers.get(method);
        if (!handler) return Promise.reject(new Error(`no handler for "${method}"`));
        return Promise.resolve(handler(payload));
      },
      on: (method: string, handler: (payload: unknown) => unknown) => {
        handlers.set(method, handler);
        return () => handlers.delete(method);
      },
    } as HostChannel;

    channel.on<{ id: string }, string>("app:ready", (payload) => payload.id);

    await expect(channel.request("app:ready", { id: "app1" })).resolves.toBe("app1");
  });
});
