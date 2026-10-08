import { routeForPath } from "../../../router";
import { buildShellNav } from "../shellNav";
import { hrefOf } from "../../../testing/hrefOf";

const APPS = [
  { id: "recipes", name: "Рецепты" },
  { id: "budget", name: "Бюджет" },
];

function selectedIds(pathname: string): string[] {
  const nav = buildShellNav(routeForPath(pathname), "f3k2xp-semya", APPS);
  return [...nav.sections, ...nav.apps, ...nav.secondary]
    .filter((item) => item.selected)
    .map((item) => item.id);
}

describe("buildShellNav", () => {
  it("links every item into the given household", () => {
    const nav = buildShellNav(routeForPath("/h/f3k2xp-semya"), "f3k2xp-semya", APPS);

    expect(nav.sections.map((item) => [item.label, hrefOf(item.link)])).toEqual([
      ["Дом", "/h/f3k2xp-semya"],
      ["Поиск", "/h/f3k2xp-semya/search"],
      ["Входящие", "/h/f3k2xp-semya/inbox"],
      ["Каталог", "/h/f3k2xp-semya/catalog"],
    ]);
    expect(nav.apps.map((item) => [item.label, hrefOf(item.link)])).toEqual([
      ["Рецепты", "/h/f3k2xp-semya/a/recipes"],
      ["Бюджет", "/h/f3k2xp-semya/a/budget"],
    ]);
    expect(nav.secondary.map((item) => hrefOf(item.link))).toEqual([
      "/h/f3k2xp-semya/settings/general",
    ]);
  });

  it.each([
    ["/h/f3k2xp-semya", ["home"]],
    ["/h/f3k2xp-semya/search", ["search"]],
    ["/h/f3k2xp-semya/inbox/ev1", ["inbox"]],
    ["/h/f3k2xp-semya/catalog/recipes", ["catalog"]],
    ["/h/f3k2xp-semya/settings/members/m1", ["settings"]],
    ["/h/f3k2xp-semya/a/budget/tx/1", ["app:budget"]],
    ["/account", []],
  ])("selects the item for %s", (pathname, expected) => {
    expect(selectedIds(pathname)).toEqual(expected);
  });
});
