import {
  AppManifest,
  HostChannel,
  HostContext,
  HostSDK,
  IframeRemote,
  MfeModule,
  ModuleFederationRemote,
  MountContext,
  Publication,
  RegistryEntry,
  SharedStateAccessor,
  User,
} from "./index";

describe("@hostyara/contracts", () => {
  const user: User = { id: "u1", name: "Ada", email: "ada@example.com" };

  const sdk: HostSDK = {
    mode: "household",
    basename: "/h/f3k2xp/a/recipes",
    context: { mode: "household", hid: "f3k2xp", user, permissions: ["read"] },
    router: {
      location: { pathname: "/", search: "", hash: "" },
      navigate: () => {},
      subscribe: () => () => {},
      link: (to) => `/h/f3k2xp/a/recipes${to}`,
    },
    nav: {
      setBreadcrumbs: () => {},
      setTitle: () => {},
    },
    apps: {
      open: () => {},
      canOpen: () => true,
    },
    share: {
      create: async () => ({ url: "https://hostyara.app/s/token", expiresAt: "2026-10-05" }),
      list: async () => [],
      revoke: async () => {},
    },
  };

  it("composes a HostSDK from mode, context, router, nav, apps and share", () => {
    expect(sdk.mode).toBe("household");
    expect(sdk.router.link("/r/1")).toBe("/h/f3k2xp/a/recipes/r/1");
    expect(sdk.apps.canOpen("budget")).toBe(true);
  });

  it("discriminates household and public context by mode", () => {
    const publicSdk: HostSDK = {
      ...sdk,
      mode: "public",
      context: { mode: "public", type: "recipe", id: "8421" },
    };

    expect(publicSdk.context.mode).toBe("public");
    expect(publicSdk.context.mode === "public" && publicSdk.context.id).toBe("8421");
  });

  it("resolves a publication through sdk.share", async () => {
    const publication: Publication = {
      token: "9fKq2m",
      appId: "recipes",
      type: "recipe",
      entityId: "8421",
      authorId: "u_713",
      createdAt: "2026-09-05T00:00:00Z",
      expiresAt: "2026-10-05T00:00:00Z",
      revokedAt: null,
    };
    const shareSdk: HostSDK = {
      ...sdk,
      share: { ...sdk.share, list: async () => [publication] },
    };

    await expect(shareSdk.share.list("recipe", "8421")).resolves.toEqual([publication]);
  });

  it("supports typed emit/subscribe on a shared-state accessor", () => {
    let state: Record<string, unknown> = {};
    const sharedState: SharedStateAccessor<Record<string, unknown>> = {
      get: () => state,
      subscribe: () => () => {},
      set: (patch) => {
        state = { ...state, ...patch };
      },
    };

    sharedState.set({ theme: "dark" });
    expect(sharedState.get()).toEqual({ theme: "dark" });
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
