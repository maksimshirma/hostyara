import { canonicalizeHidSegment } from "./hid";
import { routeForPath } from "./hostRoute";
import { createHouseholdLookup, Household } from "./householdLookup";

// IA §3: query-параметры с префиксом "_" принадлежат shell. _from несёт
// исходный адрес через экран входа.
export const FROM_PARAM = "_from";

function loginAddress(from?: string): string {
  return from ? `/login?${new URLSearchParams({ [FROM_PARAM]: from })}` : "/login";
}
import { Route, routeZone } from "./route";

export type RedirectSession =
  // Сессия ещё не известна (проверка, 2FA, BFF недоступен) — адрес не трогаем.
  | { kind: "pending" }
  // keepReturnAddress: сессия истекла — после входа вернуть на тот же адрес;
  // явный выход начинает с чистого листа.
  | { kind: "signed-out"; keepReturnAddress: boolean }
  | { kind: "signed-in"; households: Household[] };

export interface RedirectLocation {
  pathname: string;
  search: string;
  hash: string;
}

// _from приходит из адресной строки, поэтому принимается только
// относительный путь этого же origin и не страница входа (иначе петля).
export function readReturnAddress(search: string): string | null {
  const from = new URLSearchParams(search).get(FROM_PARAM);
  if (!from || !from.startsWith("/") || from.startsWith("//") || from.startsWith("/\\")) {
    return null;
  }
  const { kind } = routeForPath(new URL(from, "http://host.invalid").pathname);
  return kind === "login" || kind === "signup" ? null : from;
}

function homeOf(households: Household[]): string | null {
  const [first] = households;
  return first ? `/h/${canonicalizeHidSegment(first.hid, first.name)}` : null;
}

// IA §2: старая ссылка на пространство приводит к канонической форме
// (hid + транслитерированное название). Неизвестное пространство (не
// состоит или список ещё не загружен) не трогаем.
function canonicalSpaceAddress(
  route: Extract<Route, { kind: "space" }>,
  location: RedirectLocation,
  households: Household[],
): string | null {
  const household = createHouseholdLookup(households).resolve(route.hid);
  if (!household) return null;
  const canonical = canonicalizeHidSegment(route.hid, household.name);
  if (canonical === route.hidSegment) return null;
  const pathname = location.pathname.replace(`/h/${route.hidSegment}`, `/h/${canonical}`);
  return `${pathname}${location.search}${location.hash}`;
}

// Куда перевести адрес при данном состоянии сессии; null — оставить как есть.
// Выполняет корневой beforeLoad TanStack Router (router/routes.ts); SessionGate
// вызывает ту же функцию при рендере, чтобы не показать экран, с которого
// сейчас уведут.
export function decideRouteRedirect(
  route: Route,
  location: RedirectLocation,
  session: RedirectSession,
): string | null {
  if (session.kind === "pending") return null;

  if (session.kind === "signed-out") {
    if (routeZone(route) === "public") return null;
    if (route.kind === "root" || !session.keepReturnAddress) return loginAddress();
    return loginAddress(`${location.pathname}${location.search}${location.hash}`);
  }

  if (route.kind === "login" || route.kind === "signup") {
    return readReturnAddress(location.search) ?? homeOf(session.households) ?? "/";
  }
  if (route.kind === "root") return homeOf(session.households);
  if (route.kind !== "space") return null;
  const canonical = canonicalSpaceAddress(route, location, session.households);
  if (canonical) return canonical;
  if (route.area.kind === "settings" && route.area.section === null) {
    return `/h/${route.hidSegment}/settings/general`;
  }
  return null;
}
