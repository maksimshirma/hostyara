import { paths, Route } from "../../router";

export type NavIcon = "home" | "search" | "inbox" | "catalog" | "settings" | "app";

export interface NavItem {
  id: string;
  label: string;
  href: string;
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
// (или пространство по умолчанию вне /h/:hid); ссылки строятся только
// через paths.
export function buildShellNav(
  route: Route,
  hidSegment: string,
  apps: Array<{ id: string; name: string }>,
): ShellNav {
  const current = areaOf(route);
  const item = (area: SpaceAreaKind, label: string, href: string): NavItem => ({
    id: area,
    label,
    href,
    icon: area,
    selected: current === area,
  });

  return {
    sections: [
      item("home", "Дом", paths.space(hidSegment)),
      item("search", "Поиск", paths.search(hidSegment)),
      item("inbox", "Входящие", paths.inbox(hidSegment)),
      item("catalog", "Каталог", paths.catalog(hidSegment)),
    ],
    apps: apps.map((app) => ({
      id: `app:${app.id}`,
      label: app.name,
      href: paths.app(hidSegment, app.id),
      icon: "app",
      selected: current === `app:${app.id}`,
    })),
    secondary: [item("settings", "Настройки", paths.settings(hidSegment))],
  };
}
