import { ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { User } from "@hostyara/contracts";
import tokensHref from "@hostyara/ui/src/tokens/tokens.css?url";
import { AccessTracker } from "../api/accessTracker";
import { BffClient } from "../api/bffClient";
import { createMountManager } from "../mount-manager";
import { createObservability, DevOverlay } from "../observability";
import { loadRegistry } from "../registry/loadRegistry";
import { createRemoteLoader } from "../remote-loader";
import { canonicalizeHidSegment, Household, installDevHistoryGuard, useRoute } from "../router";
import { createAppNavStore } from "./appNavStore";
import { installGlobalErrorHandlers } from "./globalErrorHandlers";
import { NavbarBreadcrumbs } from "./shell/NavbarBreadcrumbs";
import { buildShellNav } from "./shell/shellNav";
import { ShellLayout } from "./shell/ShellLayout";
import { appNameOf, ShellServices, ShellServicesProvider } from "./ShellServices";
import { useShellBreadcrumbs } from "./useShellBreadcrumbs";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export interface HostChromeProps {
  bff: BffClient;
  // Follows the open household; HostChrome points it at route.hid.
  accessTracker: AccessTracker;
  user: User;
  // The person's households; never empty (the session gate asks to create
  // one first).
  households: Household[];
  onLogout: () => void;
  // The matched shell page or the app slot (the shell route's <Outlet/>).
  children: ReactNode;
}

// The layout of every signed-in shell route: side menu, header with
// breadcrumbs and the content area. Owns what the app slot shares with the
// chrome (ShellServices) for the whole signed-in session.
export function HostChrome({
  bff,
  accessTracker,
  user,
  households,
  onLogout,
  children,
}: HostChromeProps) {
  const [services] = useState<ShellServices>(() => ({
    bff,
    accessTracker,
    user,
    registry: loadRegistry(),
    remoteLoader: createRemoteLoader(),
    mountManager: createMountManager(tokensHref),
    observability: createObservability(),
    appNav: createAppNavStore(),
    attempt: { appId: null, version: null },
  }));
  const { registry, observability, appNav, attempt } = services;
  const route = useRoute();
  const accessSnapshot = useSyncExternalStore(accessTracker.subscribe, accessTracker.getSnapshot);
  // Outside a household the menu links into the first one.
  const defaultHid = canonicalizeHidSegment(households[0].hid, households[0].name);
  const currentHid = route.kind === "space" ? route.hid : null;
  const hidSegment = route.kind === "space" ? route.hidSegment : defaultHid;
  // The dock lists what is installed in this household once that is known.
  const apps = registry
    .list()
    .map((entry) => entry.manifest)
    .filter((manifest) => !accessSnapshot || accessSnapshot.installedApps.includes(manifest.id));
  const breadcrumbs = useShellBreadcrumbs(route, households, appNav, (appId) =>
    appNameOf(registry, appId),
  );

  useEffect(
    () =>
      installGlobalErrorHandlers(
        () => ({ appId: attempt.appId, remoteVersion: attempt.version }),
        (context, error, source) =>
          observability.reportError({ ...context, source, message: errorMessage(error) }),
      ),
    [attempt, observability],
  );

  useEffect(() => installDevHistoryGuard(() => appNav.getSnapshot().appId), [appNav]);

  useEffect(() => {
    accessTracker.setHid(currentHid);
    return () => accessTracker.setHid(null);
  }, [accessTracker, currentHid]);

  return (
    <ShellServicesProvider services={services}>
      <ShellLayout
        breadcrumbs={<NavbarBreadcrumbs trail={breadcrumbs} />}
        nav={buildShellNav(route, hidSegment, apps)}
        households={households}
        currentHid={currentHid}
        user={user}
        onLogout={onLogout}
      >
        {children}
        <DevOverlay observability={observability} />
      </ShellLayout>
    </ShellServicesProvider>
  );
}
