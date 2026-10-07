import { AppManifest, HostSDK } from "@hostyara/contracts";
import { AccessSnapshot, createAccessTracker } from "../api/accessTracker";
import { BffClient } from "../api/bffClient";
import { AppRegistry, SUPPORTED_CONTRACT_MAJOR } from "@hostyara/registry";

// Shared across unit tests that need a manifest/sdk/registry shaped
// correctly without hand-rolling one per file — most of the fields below
// don't matter to any given test, but AppManifest/HostSDK are wide enough
// that a missing one is a type error, not a helpful failure.
export function createFakeManifest(overrides: Partial<AppManifest> = {}): AppManifest {
  return {
    id: "widget",
    name: "Widget",
    version: "1.0.0",
    contract: SUPPORTED_CONTRACT_MAJOR,
    category: "utility",
    tags: [],
    surfaces: {},
    permissions: [],
    entities: [],
    routes: ["/"],
    mount: {
      remoteEntry: "http://localhost:9999/remoteEntry.js",
      exposed: "./app",
      styles: [],
    },
    network: { connect: [] },
    ...overrides,
  };
}

export function createFakeRegistry(manifests: AppManifest[] = [createFakeManifest()]): AppRegistry {
  const registry = new AppRegistry();
  for (const manifest of manifests) registry.register(manifest);
  return registry;
}

// Methods are jest.fn() rather than plain functions: tests most often
// reach for this fixture precisely because they want to assert a call
// happened (sdk.router.navigate, sdk.apps.open, ...), and a spy is a
// strict superset of a plain callable for anything that doesn't care.
export function createFakeSdk(overrides: Partial<HostSDK> = {}): HostSDK {
  return {
    mode: "household",
    basename: "/h/demo/a/widget",
    context: {
      mode: "household",
      hid: "demo",
      user: { id: "u1", name: "Demo", email: "demo@example.com" },
      permissions: [],
    },
    router: {
      location: { pathname: "/", search: "", hash: "" },
      navigate: jest.fn(),
      back: jest.fn(),
      subscribe: jest.fn(() => jest.fn()),
      link: jest.fn((to: string) => `/h/demo/a/widget${to === "/" ? "" : to}`),
    },
    nav: { setBreadcrumbs: jest.fn(), setTitle: jest.fn() },
    apps: { open: jest.fn(), canOpen: jest.fn(() => false) },
    share: {
      create: jest.fn().mockResolvedValue({ url: "", expiresAt: "" }),
      list: jest.fn().mockResolvedValue([]),
      revoke: jest.fn().mockResolvedValue(undefined),
    },
    api: { request: jest.fn().mockResolvedValue(undefined) },
    access: {
      level: "edit",
      can: jest.fn().mockReturnValue(true),
      subscribe: jest.fn(() => () => {}),
      requestAccess: jest.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}

// Every registry app installed and editable unless a test says otherwise.
export const FULL_ACCESS: AccessSnapshot = {
  role: "owner",
  installedApps: ["recipes", "budget", "recipes-iframe"],
  grants: { recipes: "edit", budget: "edit", "recipes-iframe": "edit" },
  permissions: {},
};

export const DEMO_HOUSEHOLDS = [{ hid: "demo", name: "Семья Ивановых" }];
export const DEMO_USER = { id: "u1", name: "Демо", email: "demo@example.com" };

// Everything HostChrome takes as props: the signed-in demo user in the demo
// household, and an in-memory BFF that answers /api/h/:hid/access with
// `access` behind a no-op event stream (jsdom has no EventSource).
export function createFakeShellServices(initialAccess: AccessSnapshot = FULL_ACCESS) {
  let access = initialAccess;
  const request = jest.fn(async (path: string, _init?: unknown) => {
    if (/^\/api\/h\/[^/]+\/access$/.test(path)) return access;
    return undefined;
  });
  const bff = { request } as unknown as BffClient;
  const accessTracker = createAccessTracker({
    bff,
    onSessionEnded: jest.fn(),
    createEventSource: () => ({
      readyState: 1,
      onerror: null,
      addEventListener: () => {},
      close: () => {},
    }),
  });
  return {
    bff,
    accessTracker,
    user: DEMO_USER,
    households: DEMO_HOUSEHOLDS,
    onLogout: jest.fn(),
    // Stands in for an access.changed event from the BFF.
    changeAccess(next: AccessSnapshot): Promise<void> {
      access = next;
      return accessTracker.refresh();
    },
  };
}
