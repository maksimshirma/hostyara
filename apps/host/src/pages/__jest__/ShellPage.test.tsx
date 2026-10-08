import { render, screen } from "@testing-library/react";
import { parseRoute } from "../../router";
import { ShellRouter } from "../../testing/ShellRouter";
import { ShellPage } from "../ShellPage";
import { pageChrome, shellPageTitle } from "../shellPages";

const STUBS: Array<[string, string]> = [
  ["/h/demo", "Дом"],
  ["/h/demo/search", "Поиск"],
  ["/h/demo/inbox", "Входящие"],
  ["/h/demo/inbox/ev1", "Событие"],
  ["/h/demo/catalog", "Каталог"],
  ["/h/demo/catalog/recipes", "Карточка приложения"],
  ["/h/demo/settings/general", "Общие"],
  ["/h/demo/settings/members", "Участники"],
  ["/h/demo/settings/members/m1", "Участник"],
  ["/h/demo/settings/apps", "Подприложения"],
  ["/h/demo/settings/apps/recipes", "Приложение"],
  ["/h/demo/settings/notifications", "Уведомления"],
  ["/h/demo/settings/shared", "Публикации"],
  ["/h/demo/settings/data", "Данные"],
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

describe("ShellPage", () => {
  it.each(STUBS)("renders a stub for %s titled «%s»", (pathname, title) => {
    render(<ShellPage route={parseRoute(pathname)} />, { wrapper: ShellRouter });

    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText("Раздел в разработке")).toBeInTheDocument();
  });

  it("renders a 404 with a way home for an unknown address", () => {
    render(<ShellPage route={parseRoute("/nowhere")} />, { wrapper: ShellRouter });

    expect(screen.getByRole("heading", { name: "Страница не найдена" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "На главную" })).toHaveAttribute("href", "/");
  });

  it("has no page of its own for app, auth and root routes", () => {
    for (const pathname of ["/h/demo/a/recipes", "/login", "/signup", "/"]) {
      expect(shellPageTitle(parseRoute(pathname))).toBeNull();
    }
  });
});

describe("pageChrome", () => {
  it.each([
    ["/invite/t", "standalone"],
    ["/s/t", "standalone"],
    ["/nowhere", "standalone"],
    ["/h/demo/unknown", "shell"],
    ["/h/demo/search", "shell"],
    ["/account", "shell"],
    ["/dev/health", "shell"],
  ])("draws %s as %s", (pathname, chrome) => {
    expect(pageChrome(parseRoute(pathname), pathname)).toBe(chrome);
  });
});
