import { Crumb } from "@hostyara/contracts";
import { parseRoute } from "../../router";
import { buildBreadcrumbs, formatDocumentTitle } from "../breadcrumbs";

const HOUSEHOLD = { hid: "demo", name: "Семья Ивановых" };
const APP_NAMES: Record<string, string> = { recipes: "Рецепты" };

function crumbs(pathname: string, appTrail: Crumb[] = []) {
  return buildBreadcrumbs(parseRoute(pathname), {
    household: pathname.startsWith("/h/") ? HOUSEHOLD : undefined,
    appName: (appId) => APP_NAMES[appId] ?? appId,
    appTrail,
  });
}

describe("buildBreadcrumbs", () => {
  it("shows only the household on its home", () => {
    expect(crumbs("/h/demo-semya")).toEqual([{ label: "Семья Ивановых" }]);
  });

  it("puts the household and the app first, then the app's own tail", () => {
    expect(
      crumbs("/h/demo-semya/a/recipes/r/8421/edit", [
        { label: "Паста", href: "/r/8421" },
        { label: "Редактирование", href: "/r/8421/edit" },
      ]),
    ).toEqual([
      { label: "Семья Ивановых", href: "/h/demo-semya" },
      { label: "Рецепты", href: "/h/demo-semya/a/recipes" },
      { label: "Паста", href: "/h/demo-semya/a/recipes/r/8421" },
      { label: "Редактирование" },
    ]);
  });

  it("ends on the app when it publishes nothing", () => {
    expect(crumbs("/h/demo-semya/a/recipes")).toEqual([
      { label: "Семья Ивановых", href: "/h/demo-semya" },
      { label: "Рецепты" },
    ]);
  });

  it("never turns a non-path href from an app into a link", () => {
    const trail = crumbs("/h/demo-semya/a/recipes", [
      { label: "Опасно", href: "javascript:alert(1)" },
      { label: "Чужой домен", href: "//evil.example" },
      { label: "Конец" },
    ]);
    expect(trail[2]).toEqual({ label: "Опасно", href: undefined });
    expect(trail[3]).toEqual({ label: "Чужой домен", href: undefined });
  });

  it.each([
    [
      "/h/demo-semya/search",
      [{ label: "Семья Ивановых", href: "/h/demo-semya" }, { label: "Поиск" }],
    ],
    [
      "/h/demo-semya/inbox/ev1",
      [
        { label: "Семья Ивановых", href: "/h/demo-semya" },
        { label: "Входящие", href: "/h/demo-semya/inbox" },
        { label: "Событие" },
      ],
    ],
    [
      "/h/demo-semya/catalog/recipes",
      [
        { label: "Семья Ивановых", href: "/h/demo-semya" },
        { label: "Каталог", href: "/h/demo-semya/catalog" },
        { label: "Рецепты" },
      ],
    ],
    [
      "/h/demo-semya/settings/members/m1",
      [
        { label: "Семья Ивановых", href: "/h/demo-semya" },
        { label: "Настройки", href: "/h/demo-semya/settings/general" },
        { label: "Участники", href: "/h/demo-semya/settings/members" },
        { label: "Участник" },
      ],
    ],
    [
      "/h/demo-semya/settings/general",
      [
        { label: "Семья Ивановых", href: "/h/demo-semya" },
        { label: "Настройки", href: "/h/demo-semya/settings/general" },
        { label: "Общие" },
      ],
    ],
    ["/account/security", [{ label: "Аккаунт", href: "/account" }, { label: "Безопасность" }]],
    [
      "/spaces/new",
      [{ label: "Мои пространства", href: "/spaces" }, { label: "Новое пространство" }],
    ],
    [
      "/dev/registry/recipes",
      [{ label: "Реестр ремоутов", href: "/dev/registry" }, { label: "recipes" }],
    ],
    ["/dev/health", [{ label: "Здоровье платформы" }]],
  ])("builds the trail for %s", (pathname, expected) => {
    expect(crumbs(pathname)).toEqual(expected);
  });

  it.each(["/s/token/slug", "/invite/token", "/login", "/"])("has no trail on %s", (pathname) => {
    expect(crumbs(pathname)).toEqual([]);
  });
});

describe("formatDocumentTitle", () => {
  it("prefers the app's title, then the last crumb, then the brand alone", () => {
    expect(formatDocumentTitle([{ label: "Рецепты" }], "Паста")).toBe("Паста — Хостяра");
    expect(formatDocumentTitle([{ label: "Поиск" }], null)).toBe("Поиск — Хостяра");
    expect(formatDocumentTitle([], null)).toBe("Хостяра");
  });
});
