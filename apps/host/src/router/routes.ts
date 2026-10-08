import { createRootRouteWithContext, createRoute, redirect } from "@tanstack/react-router";
import { resolveHid } from "./hid";
import { routeForPath } from "./hostRoute";
import { decideRouteRedirect, RedirectSession } from "./redirectRules";
import { computeBasename, Route, SettingsSection, SpaceArea } from "./route";

type Params = Record<string, string>;

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    // The host's own view of the matched address (router/route.ts): what
    // menus, breadcrumbs, page titles and the SDK reason about.
    toHostRoute?: (params: Params) => Route;
  }
}

function space(params: Params, area: SpaceArea): Route {
  return { kind: "space", hid: resolveHid(params.hid), hidSegment: params.hid, area };
}

function settings(section: SettingsSection, item?: string) {
  return (params: Params): Route =>
    space(params, {
      kind: "settings",
      section,
      ...(item ? { itemId: params[item] } : {}),
    });
}

export interface HostRouterContext {
  // Owned by SessionGate; it calls router.invalidate() whenever it changes.
  session: RedirectSession;
}

export const rootRoute = createRootRouteWithContext<HostRouterContext>()({
  // Every address goes through the same rules (router/redirectRules.ts):
  // auth with _from, canonical household address, bare / and settings.
  beforeLoad: ({ context, location }) => {
    const url = new URL(location.href, "http://host.invalid");
    const target = decideRouteRedirect(
      routeForPath(url.pathname),
      { pathname: url.pathname, search: url.search, hash: url.hash },
      context.session,
    );
    if (target) throw redirect({ href: target, replace: true });
  },
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  staticData: { toHostRoute: () => ({ kind: "root" }) },
});

// Экраны входа и регистрации.
export const authLayout = createRoute({ getParentRoute: () => rootRoute, id: "_auth" });
export const loginRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "login",
  staticData: { toHostRoute: () => ({ kind: "login" }) },
});
export const signupRoute = createRoute({
  getParentRoute: () => authLayout,
  path: "signup",
  staticData: { toHostRoute: () => ({ kind: "signup" }) },
});

// Публичная зона продукта (IA §5): без меню shell и без крошек.
export const publicLayout = createRoute({ getParentRoute: () => rootRoute, id: "_public" });
const publicRoutes = [
  createRoute({
    getParentRoute: () => publicLayout,
    path: "invite/$token",
    staticData: { toHostRoute: (p) => ({ kind: "invite", token: p.token }) },
  }),
  createRoute({
    getParentRoute: () => publicLayout,
    path: "s/$token",
    staticData: { toHostRoute: (p) => ({ kind: "share", token: p.token }) },
  }),
  createRoute({
    getParentRoute: () => publicLayout,
    path: "s/$token/$slug",
    staticData: { toHostRoute: (p) => ({ kind: "share", token: p.token, slug: p.slug }) },
  }),
];

// Всё под меню shell: личная зона, пространство, платформа.
export const shellLayout = createRoute({ getParentRoute: () => rootRoute, id: "_shell" });

const personalRoutes = [
  createRoute({
    getParentRoute: () => shellLayout,
    path: "account",
    staticData: { toHostRoute: () => ({ kind: "account", section: "profile" }) },
  }),
  createRoute({
    getParentRoute: () => shellLayout,
    path: "account/security",
    staticData: { toHostRoute: () => ({ kind: "account", section: "security" }) },
  }),
  createRoute({
    getParentRoute: () => shellLayout,
    path: "account/sessions",
    staticData: { toHostRoute: () => ({ kind: "account", section: "sessions" }) },
  }),
  createRoute({
    getParentRoute: () => shellLayout,
    path: "spaces",
    staticData: { toHostRoute: () => ({ kind: "spaces", section: "list" }) },
  }),
  createRoute({
    getParentRoute: () => shellLayout,
    path: "spaces/new",
    staticData: { toHostRoute: () => ({ kind: "spaces", section: "new" }) },
  }),
];

const platformRoutes = [
  createRoute({
    getParentRoute: () => shellLayout,
    path: "dev/registry",
    staticData: { toHostRoute: () => ({ kind: "dev", section: "registry" }) },
  }),
  createRoute({
    getParentRoute: () => shellLayout,
    path: "dev/registry/$appId",
    staticData: {
      toHostRoute: (p) => ({ kind: "dev", section: "registry", appId: p.appId }),
    },
  }),
  createRoute({
    getParentRoute: () => shellLayout,
    path: "dev/health",
    staticData: { toHostRoute: () => ({ kind: "dev", section: "health" }) },
  }),
];

// IA §2–§4: /h/:hid — пространство; хвост после a/:appId принадлежит
// приложению (splat), shell его не интерпретирует.
export const spaceRoute = createRoute({ getParentRoute: () => shellLayout, path: "h/$hid" });

function spaceChild<TPath extends string>(path: TPath, toHostRoute: (params: Params) => Route) {
  return createRoute({ getParentRoute: () => spaceRoute, path, staticData: { toHostRoute } });
}

export const appMountRoute = createRoute({
  getParentRoute: () => spaceRoute,
  path: "a/$appId/$",
  staticData: {
    toHostRoute: (p) =>
      space(p, {
        kind: "app",
        appId: p.appId,
        appPath: `/${p._splat ?? ""}`,
        basename: computeBasename(p.hid, p.appId),
      }),
  },
});

const spaceRoutes = [
  spaceChild("/", (p) => space(p, { kind: "home" })),
  spaceChild("search", (p) => space(p, { kind: "search" })),
  spaceChild("inbox", (p) => space(p, { kind: "inbox" })),
  spaceChild("inbox/$eventId", (p) => space(p, { kind: "inbox", eventId: p.eventId })),
  spaceChild("catalog", (p) => space(p, { kind: "catalog" })),
  spaceChild("catalog/$appId", (p) => space(p, { kind: "catalog", appId: p.appId })),
  spaceChild("settings", (p) => space(p, { kind: "settings", section: null })),
  spaceChild("settings/general", settings("general")),
  spaceChild("settings/members", settings("members")),
  spaceChild("settings/members/$memberId", settings("members", "memberId")),
  spaceChild("settings/apps", settings("apps")),
  spaceChild("settings/apps/$appId", settings("apps", "appId")),
  spaceChild("settings/notifications", settings("notifications")),
  spaceChild("settings/shared", settings("shared")),
  spaceChild("settings/data", settings("data")),
  appMountRoute,
];

// Shell and public pages that are still stubs (T8): one shared component.
export const stubRoutes = [
  ...publicRoutes,
  ...personalRoutes,
  ...platformRoutes,
  ...spaceRoutes,
].filter((route) => route !== appMountRoute);

export const routeTree = rootRoute.addChildren([
  indexRoute,
  authLayout.addChildren([loginRoute, signupRoute]),
  publicLayout.addChildren(publicRoutes),
  shellLayout.addChildren([
    ...personalRoutes,
    ...platformRoutes,
    spaceRoute.addChildren(spaceRoutes),
  ]),
]);
