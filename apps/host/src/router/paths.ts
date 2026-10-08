import { AccountSection, buildAppPath, SettingsSection } from "./route";

// IA §3: query-параметры с префиксом "_" принадлежат shell. _from несёт
// исходный адрес через экран входа.
export const FROM_PARAM = "_from";

function withFrom(pathname: string, from: string | undefined): string {
  if (!from) return pathname;
  return `${pathname}?${new URLSearchParams({ [FROM_PARAM]: from })}`;
}

function space(hidSegment: string, ...rest: string[]): string {
  return ["", "h", hidSegment, ...rest.map(encodeURIComponent)].join("/");
}

// Обратная сторона parseRoute: единственный способ строить shell-ссылки,
// чтобы схема адресов жила в одном месте.
export const paths = {
  root: () => "/",
  login: (opts: { from?: string } = {}) => withFrom("/login", opts.from),
  signup: (opts: { from?: string } = {}) => withFrom("/signup", opts.from),
  invite: (token: string) => `/invite/${encodeURIComponent(token)}`,
  share: (token: string, slug?: string) =>
    slug
      ? `/s/${encodeURIComponent(token)}/${encodeURIComponent(slug)}`
      : `/s/${encodeURIComponent(token)}`,
  account: (section: AccountSection = "profile") =>
    section === "profile" ? "/account" : `/account/${section}`,
  spaces: () => "/spaces",
  newSpace: () => "/spaces/new",
  space: (hidSegment: string) => space(hidSegment),
  search: (hidSegment: string) => space(hidSegment, "search"),
  inbox: (hidSegment: string, eventId?: string) =>
    eventId ? space(hidSegment, "inbox", eventId) : space(hidSegment, "inbox"),
  catalog: (hidSegment: string, appId?: string) =>
    appId ? space(hidSegment, "catalog", appId) : space(hidSegment, "catalog"),
  settings: (hidSegment: string, section: SettingsSection = "general", itemId?: string) =>
    itemId
      ? space(hidSegment, "settings", section, itemId)
      : space(hidSegment, "settings", section),
  app: buildAppPath,
  devRegistry: (appId?: string) =>
    appId ? `/dev/registry/${encodeURIComponent(appId)}` : "/dev/registry",
  devHealth: () => "/dev/health",
};
