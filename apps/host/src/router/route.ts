import { resolveHid } from "./hid";

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

// Разделы настроек, у которых есть страница отдельного элемента.
const SETTINGS_SECTIONS_WITH_ITEM: readonly SettingsSection[] = ["members", "apps"];

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

const NOT_FOUND: Route = { kind: "not-found" };

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

function splitSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

export function computeBasename(hidSegment: string, appId: string): string {
  return `/h/${hidSegment}/a/${appId}`;
}

export function buildAppPath(hidSegment: string, appId: string, appPath = "/"): string {
  const suffix = appPath === "/" || appPath === "" ? "" : appPath;
  return `${computeBasename(hidSegment, appId)}${suffix}`;
}

function isSettingsSection(value: string): value is SettingsSection {
  return (SETTINGS_SECTIONS as readonly string[]).includes(value);
}

// Хвост после "settings": [], [section], [section, itemId].
function parseSettingsArea(rest: string[]): SpaceArea | null {
  if (rest.length === 0) return { kind: "settings", section: null };
  const [section, itemId, ...extra] = rest;
  if (!isSettingsSection(section) || extra.length > 0) return null;
  if (itemId === undefined) return { kind: "settings", section };
  if (!SETTINGS_SECTIONS_WITH_ITEM.includes(section)) return null;
  return { kind: "settings", section, itemId };
}

// Хвост после /h/:hid. Подприложение владеет всем после a/:appId,
// остальные разделы shell не допускают лишних сегментов.
function parseSpaceArea(hidSegment: string, rest: string[]): SpaceArea | null {
  if (rest.length === 0) return { kind: "home" };
  const [area, id, ...extra] = rest;

  if (area === "a") {
    if (!id) return null;
    return {
      kind: "app",
      appId: id,
      appPath: `/${extra.join("/")}`,
      basename: computeBasename(hidSegment, id),
    };
  }
  if (area === "settings") return parseSettingsArea(rest.slice(1));
  if (extra.length > 0) return null;
  if (area === "search") return id === undefined ? { kind: "search" } : null;
  if (area === "inbox")
    return id === undefined ? { kind: "inbox" } : { kind: "inbox", eventId: id };
  if (area === "catalog") {
    return id === undefined ? { kind: "catalog" } : { kind: "catalog", appId: id };
  }
  return null;
}

function parseAccount(rest: string[]): Route {
  if (rest.length === 0) return { kind: "account", section: "profile" };
  if (rest.length > 1) return NOT_FOUND;
  if (rest[0] === "security" || rest[0] === "sessions") {
    return { kind: "account", section: rest[0] };
  }
  return NOT_FOUND;
}

function parseSpaces(rest: string[]): Route {
  if (rest.length === 0) return { kind: "spaces", section: "list" };
  if (rest.length === 1 && rest[0] === "new") return { kind: "spaces", section: "new" };
  return NOT_FOUND;
}

function parseDev(rest: string[]): Route {
  const [section, appId, ...extra] = rest;
  if (extra.length > 0) return NOT_FOUND;
  if (section === "registry") {
    return appId === undefined ? { kind: "dev", section } : { kind: "dev", section, appId };
  }
  if (section === "health" && appId === undefined) return { kind: "dev", section };
  return NOT_FOUND;
}

// IA §4: таблица маршрутов shell. Внутри /h/:hid/a/:appId/* — зона
// подприложения, shell не интерпретирует хвост.
export function parseRoute(pathname: string): Route {
  const segments = splitSegments(pathname);
  if (segments.length === 0) return { kind: "root" };

  const [head, first, ...rest] = segments;
  const tail = segments.slice(1);

  switch (head) {
    case "login":
    case "signup":
      return tail.length === 0 ? { kind: head } : NOT_FOUND;
    case "invite":
      return tail.length === 1 ? { kind: "invite", token: first } : NOT_FOUND;
    case "s":
      if (tail.length === 1) return { kind: "share", token: first };
      if (tail.length === 2) return { kind: "share", token: first, slug: rest[0] };
      return NOT_FOUND;
    case "account":
      return parseAccount(tail);
    case "spaces":
      return parseSpaces(tail);
    case "dev":
      return parseDev(tail);
    case "h": {
      if (!first) return NOT_FOUND;
      const area = parseSpaceArea(first, rest);
      if (!area) return NOT_FOUND;
      return { kind: "space", hid: resolveHid(first), hidSegment: first, area };
    }
    default:
      return NOT_FOUND;
  }
}
