import { Crumb } from "@hostyara/contracts";
import { LinkOptions, linkOptions } from "@tanstack/react-router";
import { buildAppPath, Household, Route } from "../router";
import { SETTINGS_TITLES, shellPageTitle } from "../pages/shellPages";

export interface Breadcrumb {
  label: string;
  // Типизированный маршрут shell или адрес внутри приложения (строка — из
  // sdk.nav). У последнего звена ссылки нет.
  link?: LinkOptions | string;
}

export interface BreadcrumbContext {
  household: Household | undefined;
  appName(appId: string): string;
  // Хвост цепочки, опубликованный смонтированным приложением.
  appTrail: Crumb[];
}

export const BRAND = "Хостяра";

// href из sdk.nav — путь внутри приложения ("/r/8421"); всё, что не
// начинается с одного "/", ссылкой не становится (javascript:, чужие домены).
function resolveAppHref(hidSegment: string, appId: string, href: string | undefined) {
  if (!href || !href.startsWith("/") || href.startsWith("//")) return undefined;
  return buildAppPath(hidSegment, appId, href);
}

const settingsSection = (hid: string, section: string): LinkOptions => {
  switch (section) {
    case "members":
      return linkOptions({ to: "/h/$hid/settings/members", params: { hid } });
    case "apps":
      return linkOptions({ to: "/h/$hid/settings/apps", params: { hid } });
    case "notifications":
      return linkOptions({ to: "/h/$hid/settings/notifications", params: { hid } });
    case "shared":
      return linkOptions({ to: "/h/$hid/settings/shared", params: { hid } });
    case "data":
      return linkOptions({ to: "/h/$hid/settings/data", params: { hid } });
    default:
      return linkOptions({ to: "/h/$hid/settings/general", params: { hid } });
  }
};

function withoutLastLink(trail: Breadcrumb[]): Breadcrumb[] {
  if (trail.length === 0) return trail;
  const last = trail[trail.length - 1];
  return [...trail.slice(0, -1), { label: last.label }];
}

function spaceTrail(
  route: Extract<Route, { kind: "space" }>,
  context: BreadcrumbContext,
): Breadcrumb[] {
  const { hidSegment, area } = route;
  const hid = hidSegment;
  const root = {
    label: context.household?.name || "Пространство",
    link: linkOptions({ to: "/h/$hid", params: { hid } }),
  };
  const title = shellPageTitle(route) ?? "";

  switch (area.kind) {
    case "home":
      return [root];
    case "app":
      return [
        root,
        {
          label: context.appName(area.appId),
          link: linkOptions({
            to: "/h/$hid/a/$appId/$",
            params: { hid, appId: area.appId, _splat: "" },
          }),
        },
        ...context.appTrail.map((crumb) => ({
          label: crumb.label,
          link: resolveAppHref(hidSegment, area.appId, crumb.href),
        })),
      ];
    case "inbox":
      return area.eventId
        ? [
            root,
            { label: "Входящие", link: linkOptions({ to: "/h/$hid/inbox", params: { hid } }) },
            { label: title },
          ]
        : [root, { label: title }];
    case "catalog":
      return area.appId
        ? [
            root,
            { label: "Каталог", link: linkOptions({ to: "/h/$hid/catalog", params: { hid } }) },
            { label: context.appName(area.appId) },
          ]
        : [root, { label: title }];
    case "settings": {
      const settings = { label: "Настройки", link: settingsSection(hid, "general") };
      if (area.section === null) return [root, settings];
      const section = {
        label: SETTINGS_TITLES[area.section],
        link: settingsSection(hid, area.section),
      };
      return area.itemId ? [root, settings, section, { label: title }] : [root, settings, section];
    }
    case "search":
      return [root, { label: title }];
  }
}

// Цепочка крошек для шапки shell. Первые звенья (пространство, раздел или
// приложение) знает shell, дальнейшие публикует приложение (IA §8).
export function buildBreadcrumbs(route: Route, context: BreadcrumbContext): Breadcrumb[] {
  const title = shellPageTitle(route) ?? "";
  switch (route.kind) {
    case "space":
      return withoutLastLink(spaceTrail(route, context));
    case "account":
      return withoutLastLink([
        { label: "Аккаунт", link: linkOptions({ to: "/account" }) },
        { label: title },
      ]);
    case "spaces":
      return withoutLastLink(
        route.section === "new"
          ? [{ label: "Мои пространства", link: linkOptions({ to: "/spaces" }) }, { label: title }]
          : [{ label: title }],
      );
    case "dev":
      return withoutLastLink(
        route.section === "registry" && route.appId
          ? [
              { label: "Реестр ремоутов", link: linkOptions({ to: "/dev/registry" }) },
              { label: route.appId },
            ]
          : [{ label: title }],
      );
    case "not-found":
      return [{ label: title }];
    default:
      // Публичные страницы — без крошек: первое звено раскрыло бы пространство.
      return [];
  }
}

export function formatDocumentTitle(trail: Breadcrumb[], appTitle: string | null): string {
  const page = appTitle ?? trail[trail.length - 1]?.label;
  return page ? `${page} — ${BRAND}` : BRAND;
}
