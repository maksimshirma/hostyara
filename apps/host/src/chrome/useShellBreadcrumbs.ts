import { useEffect, useSyncExternalStore } from "react";
import { createHouseholdLookup, Household, Route } from "../router";
import { AppNavStore } from "./appNavStore";
import { Breadcrumb, BRAND, buildBreadcrumbs, formatDocumentTitle } from "./breadcrumbs";

// Крошки для шапки и document.title: маршрут + то, что опубликовало
// открытое сейчас приложение.
export function useShellBreadcrumbs(
  route: Route,
  households: Household[],
  appNav: AppNavStore,
  appName: (appId: string) => string,
): Breadcrumb[] {
  const nav = useSyncExternalStore(appNav.subscribe, appNav.getSnapshot);
  const ownsRoute =
    route.kind === "space" && route.area.kind === "app" && route.area.appId === nav.appId;
  const trail = buildBreadcrumbs(route, {
    household:
      route.kind === "space" ? createHouseholdLookup(households).resolve(route.hid) : undefined,
    appName,
    appTrail: ownsRoute ? nav.trail : [],
  });
  const documentTitle = formatDocumentTitle(trail, ownsRoute ? nav.title : null);

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);
  useEffect(
    () => () => {
      document.title = BRAND;
    },
    [],
  );

  return trail;
}
