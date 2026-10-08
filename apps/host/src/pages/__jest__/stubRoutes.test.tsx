jest.mock("@module-federation/runtime", () => ({
  init: jest.fn(),
  registerRemotes: jest.fn(),
  loadRemote: jest.fn(() => new Promise(() => {})),
}));

import { screen } from "@testing-library/react";
import { routeForPath } from "../../router";
import { createFakeShellServices } from "../../testing/fixtures";
import { renderShell } from "../../testing/renderShell";
import { shellPageTitle } from "../shellPages";

const STUBS: Array<[string, string]> = [
  ["/h/demo-semya-ivanovyh", "Дом"],
  ["/h/demo-semya-ivanovyh/search", "Поиск"],
  ["/h/demo-semya-ivanovyh/inbox", "Входящие"],
  ["/h/demo-semya-ivanovyh/inbox/ev1", "Событие"],
  ["/h/demo-semya-ivanovyh/catalog", "Каталог"],
  ["/h/demo-semya-ivanovyh/catalog/recipes", "Карточка приложения"],
  ["/h/demo-semya-ivanovyh/settings/general", "Общие"],
  ["/h/demo-semya-ivanovyh/settings/members", "Участники"],
  ["/h/demo-semya-ivanovyh/settings/members/m1", "Участник"],
  ["/h/demo-semya-ivanovyh/settings/apps", "Подприложения"],
  ["/h/demo-semya-ivanovyh/settings/apps/recipes", "Приложение"],
  ["/h/demo-semya-ivanovyh/settings/notifications", "Уведомления"],
  ["/h/demo-semya-ivanovyh/settings/shared", "Публикации"],
  ["/h/demo-semya-ivanovyh/settings/data", "Данные"],
  ["/account", "Профиль"],
  ["/account/security", "Безопасность"],
  ["/account/sessions", "Устройства и сессии"],
  ["/spaces", "Мои пространства"],
  ["/spaces/new", "Новое пространство"],
  ["/dev/registry", "Реестр ремоутов"],
  ["/dev/registry/recipes", "Ремоут"],
  ["/dev/health", "Здоровье платформы"],
  ["/invite/tk9", "Приглашение в пространство"],
  ["/s/9fKq2m/pasta", "Публикация"],
];

async function renderAt(pathname: string) {
  window.history.replaceState(null, "", pathname);
  await renderShell(createFakeShellServices());
}

beforeEach(() => {
  jest.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("stub routes", () => {
  it.each(STUBS)("renders a stub for %s titled «%s»", async (pathname, title) => {
    await renderAt(pathname);

    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText("Раздел в разработке")).toBeInTheDocument();
  });

  it("draws public pages without the shell menu", async () => {
    await renderAt("/s/9fKq2m/pasta");

    expect(await screen.findByRole("heading", { name: "Публикация" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Приложения" })).not.toBeInTheDocument();
  });

  it("draws a 404 inside the shell within a household", async () => {
    await renderAt("/h/demo-semya-ivanovyh/no-such-section");

    expect(await screen.findByRole("heading", { name: "Страница не найдена" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Приложения" })).toBeInTheDocument();
  });

  it("draws a standalone 404 outside a household", async () => {
    await renderAt("/no-such-page");

    expect(await screen.findByRole("heading", { name: "Страница не найдена" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "На главную" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("navigation", { name: "Приложения" })).not.toBeInTheDocument();
  });

  it("has no page title of its own for app, auth and root routes", () => {
    for (const pathname of ["/h/demo/a/recipes", "/login", "/signup", "/"]) {
      expect(shellPageTitle(routeForPath(pathname))).toBeNull();
    }
  });
});
