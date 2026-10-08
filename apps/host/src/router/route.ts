// IA §3: корневые сегменты приложения. Ни один не может совпадать по форме
// с языковым кодом маркетинга (инвариант 6) — проверяется тестом.
export const RESERVED_ROOT_SEGMENTS = [
  "h",
  "s",
  "account",
  "spaces",
  "login",
  "signup",
  "logout",
  "invite",
  "dev",
  ".well-known",
] as const;

// IA §3: сегменты первого уровня внутри пространства, зарезервированные
// шеллом. "a" открывает зону монтирования подприложений; appId не может
// совпасть ни с одним из них, потому что appId всегда стоит после "a/".
export const RESERVED_SPACE_SEGMENTS = ["a", "catalog", "inbox", "search", "settings"] as const;

export const SETTINGS_SECTIONS = [
  "general",
  "members",
  "apps",
  "notifications",
  "shared",
  "data",
] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const ACCOUNT_SECTIONS = ["profile", "security", "sessions"] as const;
export type AccountSection = (typeof ACCOUNT_SECTIONS)[number];

export type SpaceArea =
  | { kind: "app"; appId: string; appPath: string; basename: string }
  | { kind: "home" }
  | { kind: "search" }
  | { kind: "inbox"; eventId?: string }
  | { kind: "catalog"; appId?: string }
  // section === null — голый /settings, который редиректится на general.
  | { kind: "settings"; section: SettingsSection | null; itemId?: string };

export type Route =
  | { kind: "root" }
  | { kind: "login" }
  | { kind: "signup" }
  | { kind: "invite"; token: string }
  | { kind: "share"; token: string; slug?: string }
  | { kind: "account"; section: AccountSection }
  | { kind: "spaces"; section: "list" | "new" }
  | { kind: "space"; hid: string; hidSegment: string; area: SpaceArea }
  | { kind: "dev"; section: "registry"; appId?: string }
  | { kind: "dev"; section: "health" }
  | { kind: "not-found" };

// public — доступно без сессии; personal — аккаунт человека вне
// пространства; space — внутри /h/:hid; platform — разработка и эксплуатация.
export type RouteZone = "public" | "personal" | "space" | "platform";

export function routeZone(route: Route): RouteZone {
  switch (route.kind) {
    case "login":
    case "signup":
    case "invite":
    case "share":
    case "not-found":
      return "public";
    case "space":
      return "space";
    case "dev":
      return "platform";
    case "root":
    case "account":
    case "spaces":
      return "personal";
  }
}

export function computeBasename(hidSegment: string, appId: string): string {
  return `/h/${hidSegment}/a/${appId}`;
}

export function buildAppPath(hidSegment: string, appId: string, appPath = "/"): string {
  const suffix = appPath === "/" || appPath === "" ? "" : appPath;
  return `${computeBasename(hidSegment, appId)}${suffix}`;
}
