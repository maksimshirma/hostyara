import { AccountSection, Route, SettingsSection, SpaceArea } from "../router";

export const SETTINGS_TITLES: Record<SettingsSection, string> = {
  general: "Общие",
  members: "Участники",
  apps: "Подприложения",
  notifications: "Уведомления",
  shared: "Публикации",
  data: "Данные",
};

const SETTINGS_ITEM_TITLES: Partial<Record<SettingsSection, string>> = {
  members: "Участник",
  apps: "Приложение",
};

const ACCOUNT_TITLES: Record<AccountSection, string> = {
  profile: "Профиль",
  security: "Безопасность",
  sessions: "Устройства и сессии",
};

function spaceAreaTitle(area: Exclude<SpaceArea, { kind: "app" }>): string {
  switch (area.kind) {
    case "home":
      return "Дом";
    case "search":
      return "Поиск";
    case "inbox":
      return area.eventId ? "Событие" : "Входящие";
    case "catalog":
      return area.appId ? "Карточка приложения" : "Каталог";
    case "settings":
      if (area.section === null) return "Настройки";
      if (area.itemId) return SETTINGS_ITEM_TITLES[area.section] ?? SETTINGS_TITLES[area.section];
      return SETTINGS_TITLES[area.section];
  }
}

// Заголовок страницы shell по маршруту; null — у маршрута нет своей
// страницы (подприложение рисует себя само, вход/регистрация — отдельные
// экраны, корень всегда редиректится).
export function shellPageTitle(route: Route): string | null {
  switch (route.kind) {
    case "space":
      return route.area.kind === "app" ? null : spaceAreaTitle(route.area);
    case "account":
      return ACCOUNT_TITLES[route.section];
    case "spaces":
      return route.section === "new" ? "Новое пространство" : "Мои пространства";
    case "dev":
      if (route.section === "health") return "Здоровье платформы";
      return route.appId ? "Ремоут" : "Реестр ремоутов";
    case "invite":
      return "Приглашение в пространство";
    case "share":
      return "Публикация";
    case "not-found":
      return "Страница не найдена";
    case "root":
    case "login":
    case "signup":
      return null;
  }
}

// Где рисуется страница: внутри shell (меню, крошки) или отдельно —
// публичные страницы не раскрывают пространство (IA §5), а 404 вне /h/
// не относится ни к какому пространству.
export function pageChrome(route: Route, pathname: string): "shell" | "standalone" {
  if (route.kind === "invite" || route.kind === "share") return "standalone";
  if (route.kind === "not-found" && !pathname.startsWith("/h/")) return "standalone";
  return "shell";
}
