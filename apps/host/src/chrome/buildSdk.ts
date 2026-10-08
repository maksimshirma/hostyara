import { HostSDK, User } from "@hostyara/contracts";
import { AccessTracker } from "../api/accessTracker";
import { BffClient } from "../api/bffClient";
import { createSdkAccess } from "../api/createSdkAccess";
import { createSdkApi } from "../api/createSdkApi";
import { RouterHistory } from "@tanstack/react-router";
import { createSdkRouter, getLiveBasename, routeForPath } from "../router";
import { AppNavStore } from "./appNavStore";

export interface SdkDeps {
  bff: BffClient;
  accessTracker: AccessTracker;
  user: User;
  appNav: AppNavStore;
}

function hidOf(history: RouterHistory): string | null {
  const route = routeForPath(history.location.pathname);
  return route.kind === "space" ? route.hid : null;
}

// apps/share are still stand-ins (no cross-app links or sharing built
// yet); nav feeds the shell's breadcrumbs and document title — router is the real thing, wired to the host's own
// history via createSdkRouter; api/access go through the BFF.
//
// basename/context read from history live (see createSdkRouter) rather
// than being captured once here — a household switch (hid change) while
// this app stays mounted (T15) must update what the app sees without a
// remount, and a fresh read on every access is what makes that automatic.
export function buildSdk(appId: string, history: RouterHistory, deps: SdkDeps): HostSDK {
  return {
    mode: "household",
    get basename() {
      return getLiveBasename(history, appId);
    },
    get context() {
      return {
        mode: "household" as const,
        hid: hidOf(history) ?? "",
        user: deps.user,
        // Deprecated snapshot kept for compatibility; sdk.access is live.
        permissions: deps.accessTracker.getSnapshot()?.permissions[appId] ?? [],
      };
    },
    router: createSdkRouter(history, appId),
    nav: {
      setBreadcrumbs: (trail) => deps.appNav.setBreadcrumbs(appId, trail),
      setTitle: (title) => deps.appNav.setTitle(appId, title),
    },
    apps: { open: () => {}, canOpen: () => false },
    share: {
      create: async () => ({ url: "", expiresAt: "" }),
      list: async () => [],
      revoke: async () => {},
    },
    api: createSdkApi(deps.bff, appId, () => hidOf(history)),
    access: createSdkAccess(deps.accessTracker, deps.bff, appId),
  };
}
