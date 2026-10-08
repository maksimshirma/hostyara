import { LinkOptions, linkOptions } from "@tanstack/react-router";
import { Route } from "../../router";

export type NavIcon = "home" | "search" | "inbox" | "catalog" | "settings" | "app";

export interface NavItem {
  id: string;
  label: string;
  link: LinkOptions;
  icon: NavIcon;
  selected: boolean;
}

export interface ShellNav {
  // Разделы shell внутри пространства.
  sections: NavItem[];
  // Установленные приложения — док (IA §8).
  apps: NavItem[];
  // Нижняя часть меню.
  secondary: NavItem[];
}

type SpaceAreaKind = "home" | "search" | "inbox" | "catalog" | "settings";

function areaOf(route: Route): SpaceAreaKind | `app:${string}` | null {
  if (route.kind !== "space") return null;
  return route.area.kind === "app" ? `app:${route.area.appId}` : route.area.kind;
}

// Навигация shell для текущего адреса. hidSegment — открытое пространство
// (или пространство по умолчанию вне /h/:hid).
export function buildShellNav(
  route: Route,
  hidSegment: string,
  apps: Array<{ id: string; name: string }>,
): ShellNav {
  const current = areaOf(route);
  const params = { hid: hidSegment };
  const item = (area: SpaceAreaKind, label: string, link: LinkOptions): NavItem => ({
    id: area,
    label,
    link,
    icon: area,
    selected: current === area,
  });

  return {
    sections: [
      item("home", "Дом", linkOptions({ to: "/h/$hid", params })),
      item("search", "Поиск", linkOptions({ to: "/h/$hid/search", params })),
      item("inbox", "Входящие", linkOptions({ to: "/h/$hid/inbox", params })),
      item("catalog", "Каталог", linkOptions({ to: "/h/$hid/catalog", params })),
    ],
    apps: apps.map((app) => ({
      id: `app:${app.id}`,
      label: app.name,
      link: linkOptions({
        to: "/h/$hid/a/$appId/$",
        params: { hid: hidSegment, appId: app.id, _splat: "" },
      }),
      icon: "app",
      selected: current === `app:${app.id}`,
    })),
    secondary: [
      item("settings", "Настройки", linkOptions({ to: "/h/$hid/settings/general", params })),
    ],
  };
}
