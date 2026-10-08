import { createContext, ReactNode, useContext, useMemo, useSyncExternalStore } from "react";
import { HostRouter, HostRouterLocation } from "./createHostRouter";
import { parseRoute, Route } from "./route";

const RouterContext = createContext<HostRouter | null>(null);

export function RouterProvider({ router, children }: { router: HostRouter; children: ReactNode }) {
  return <RouterContext.Provider value={router}>{children}</RouterContext.Provider>;
}

export function useHostRouter(): HostRouter {
  const router = useContext(RouterContext);
  if (!router) throw new Error("useHostRouter must be used within a RouterProvider");
  return router;
}

function currentHref(router: HostRouter): string {
  const { pathname, search, hash } = router.getLocation();
  return `${pathname}${search}${hash}`;
}

// The snapshot is the href string: getLocation() returns a fresh object on
// every call, which useSyncExternalStore would treat as a change each time.
export function useRouterLocation(router: HostRouter): HostRouterLocation {
  const href = useSyncExternalStore(router.subscribe, () => currentHref(router));
  return useMemo(() => {
    const url = new URL(href, "http://host.invalid");
    return { pathname: url.pathname, search: url.search, hash: url.hash };
  }, [href]);
}

export function useHostLocation(): HostRouterLocation {
  return useRouterLocation(useHostRouter());
}

export function useRoute(): Route {
  const { pathname } = useHostLocation();
  return useMemo(() => parseRoute(pathname), [pathname]);
}
