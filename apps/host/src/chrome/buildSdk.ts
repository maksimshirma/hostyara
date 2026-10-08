import { HostSDK, User } from "@hostyara/contracts";
import { AccessTracker } from "../api/accessTracker";
import { BffClient } from "../api/bffClient";
import { createSdkAccess } from "../api/createSdkAccess";
import { createSdkApi } from "../api/createSdkApi";
import { createSdkRouter, getLiveBasename, HostRouter } from "../router";
import { AppNavStore } from "./appNavStore";

export interface SdkDeps {
  bff: BffClient;
  accessTracker: AccessTracker;
  user: User;
  appNav: AppNavStore;
}

function hidOf(hostRouter: HostRouter): string | null {
  const route = hostRouter.getRoute();
  return route.kind === "space" ? route.hid : null;
}

// apps/share are still stand-ins (no cross-app links or sharing built
// yet); nav feeds the shell's breadcrumbs and document title — router is the real thing, wired to the host's own
// router via createSdkRouter; api/access go through the BFF.
//
// basename/context read from hostRouter live (see createSdkRouter) rather
// than being captured once here — a household switch (hid change) while
// this app stays mounted (T15) must update what the app sees without a
// remount, and a fresh read on every access is what makes that automatic.
export function buildSdk(appId: string, hostRouter: HostRouter, deps: SdkDeps): HostSDK {
  return {
    mode: "household",
    get basename() {
      return getLiveBasename(hostRouter, appId);
    },
    get context() {
      return {
        mode: "household" as const,
        hid: hidOf(hostRouter) ?? "",
        user: deps.user,
        // Deprecated snapshot kept for compatibility; sdk.access is live.
        permissions: deps.accessTracker.getSnapshot()?.permissions[appId] ?? [],
      };
    },
    router: createSdkRouter(hostRouter, appId),
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
    api: createSdkApi(deps.bff, appId, () => hidOf(hostRouter)),
    access: createSdkAccess(deps.accessTracker, deps.bff, appId),
  };
}
