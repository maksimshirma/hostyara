import { HostSDK, Location } from "@hostyara/contracts";

// tech.md §8: sdk.ui covers the cases where an app would otherwise reach
// for a portal into document.body (dialog/confirm/drawer/toast) and lose
// its styles crossing the shadow boundary — plus styleRoot, for CSS-in-JS
// libraries that need an explicit mount container. Not part of the real
// HostSDK contract yet (no task has wired it through the host), but an
// author building against the documented shape can start using it now;
// this stays a dev-only stub until the platform actually ships it.
export interface DevHarnessUi {
  styleRoot: ShadowRoot;
  dialog(content: unknown): Promise<void>;
  confirm(message: string): Promise<boolean>;
  drawer(content: unknown): Promise<void>;
  toast(message: string): void;
}

export type DevHarnessSdk = HostSDK & { ui: DevHarnessUi };

export interface DevHarnessOptions {
  appId: string;
  hid?: string;
  // Defaults to "/" — see runDevHarness for why that's not just the
  // static file's own served path.
  startPath?: string;
}

function currentLocation(): Location {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  };
}

// Standalone mode has no /h/:hid/a/:appId scheme to strip — this page is
// entirely the one app, so router.location is just the real address bar,
// and navigate()/back() drive the real window.history directly (something
// an app is never allowed to do once it's actually hosted — acceptable
// here specifically because there is no host to own it instead).
export function createDevHarnessSdk(
  styleRoot: ShadowRoot,
  options: DevHarnessOptions,
): DevHarnessSdk {
  const listeners = new Set<(location: Location) => void>();

  window.addEventListener("popstate", () => {
    for (const listener of listeners) listener(currentLocation());
  });

  return {
    mode: "household",
    basename: "",
    context: {
      mode: "household",
      hid: options.hid ?? "dev-harness",
      user: { id: "dev-user", name: "Dev Harness", email: "dev-harness@example.com" },
      permissions: [],
    },
    router: {
      get location() {
        return currentLocation();
      },
      navigate(to, opts) {
        if (opts?.replace) window.history.replaceState(null, "", to);
        else window.history.pushState(null, "", to);
        for (const listener of listeners) listener(currentLocation());
      },
      back() {
        window.history.back();
      },
      subscribe(callback) {
        listeners.add(callback);
        return () => listeners.delete(callback);
      },
      link(to) {
        return to;
      },
    },
    nav: {
      setBreadcrumbs: () => {},
      setTitle(title) {
        document.title = `${title} — dev harness (${options.appId})`;
      },
    },
    apps: { open: () => {}, canOpen: () => false },
    share: {
      create: async () => ({ url: "", expiresAt: "" }),
      list: async () => [],
      revoke: async () => {},
    },
    ui: {
      styleRoot,
      async dialog() {
        console.info(`[dev-harness:${options.appId}] sdk.ui.dialog() called`);
      },
      async confirm(message) {
        console.info(`[dev-harness:${options.appId}] sdk.ui.confirm() called:`, message);
        return window.confirm(message);
      },
      async drawer() {
        console.info(`[dev-harness:${options.appId}] sdk.ui.drawer() called`);
      },
      toast(message) {
        console.info(`[dev-harness:${options.appId}] sdk.ui.toast():`, message);
      },
    },
  };
}
