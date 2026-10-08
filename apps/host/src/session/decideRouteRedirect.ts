import { FROM_PARAM, Household, parseRoute, paths, Route, routeZone } from "../router";

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
  const { kind } = parseRoute(new URL(from, "http://host.invalid").pathname);
  return kind === "login" || kind === "signup" ? null : from;
}

function homeOf(households: Household[]): string | null {
  return households.length > 0 ? paths.space(households[0].hid) : null;
}

// Куда перевести адрес при данном состоянии сессии; null — оставить как есть.
export function decideRouteRedirect(
  route: Route,
  location: RedirectLocation,
  session: RedirectSession,
): string | null {
  if (session.kind === "pending") return null;

  if (session.kind === "signed-out") {
    if (routeZone(route) === "public") return null;
    if (route.kind === "root" || !session.keepReturnAddress) return paths.login();
    return paths.login({ from: `${location.pathname}${location.search}${location.hash}` });
  }

  if (route.kind === "login" || route.kind === "signup") {
    return readReturnAddress(location.search) ?? homeOf(session.households) ?? paths.root();
  }
  if (route.kind === "root") return homeOf(session.households);
  if (route.kind === "space" && route.area.kind === "settings" && route.area.section === null) {
    return paths.settings(route.hidSegment);
  }
  return null;
}
