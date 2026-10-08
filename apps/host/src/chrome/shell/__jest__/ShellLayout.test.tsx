import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { routeForPath } from "../../../router";
import { ShellRouter } from "../../../testing/ShellRouter";
import { buildShellNav } from "../shellNav";
import { ShellLayout } from "../ShellLayout";

const HOUSEHOLDS = [
  { hid: "demo", name: "Семья Ивановых" },
  { hid: "dacha", name: "Дача" },
];
const USER = { id: "u1", name: "Анна Иванова", email: "anna@example.com" };

function renderShell(pathname: string, onLogout = jest.fn()) {
  window.history.replaceState(null, "", pathname);
  const route = routeForPath(pathname);
  render(
    <ShellLayout
      nav={buildShellNav(route, "demo-semya-ivanovyh", [{ id: "recipes", name: "Рецепты" }])}
      households={HOUSEHOLDS}
      currentHid={route.kind === "space" ? route.hid : null}
      user={USER}
      onLogout={onLogout}
    >
      <p>Контент</p>
    </ShellLayout>,
    { wrapper: ShellRouter },
  );
  return onLogout;
}

beforeEach(() => {
  jest.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("ShellLayout", () => {
  it("renders sections and apps as real links, marking the current one", () => {
    renderShell("/h/demo-semya-ivanovyh/a/recipes");

    const apps = screen.getByRole("navigation", { name: "Приложения" });
    const recipes = within(apps).getByRole("link", { name: "Рецепты" });
    expect(recipes).toHaveAttribute("href", "/h/demo-semya-ivanovyh/a/recipes");
    expect(recipes).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Дом" })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Контент")).toBeInTheDocument();
  });

  it("navigates through the host router on a plain click", async () => {
    renderShell("/h/demo-semya-ivanovyh");

    await userEvent.click(screen.getByRole("link", { name: "Входящие" }));

    expect(window.location.pathname).toBe("/h/demo-semya-ivanovyh/inbox");
  });

  it("switches households and offers to create one", async () => {
    renderShell("/h/demo-semya-ivanovyh");

    await userEvent.click(screen.getByRole("combobox", { name: "Пространство" }));
    await userEvent.click(screen.getByRole("option", { name: "Дача" }));
    expect(window.location.pathname).toBe("/h/dacha-dacha");

    await userEvent.click(screen.getByRole("combobox", { name: "Пространство" }));
    await userEvent.click(screen.getByRole("option", { name: "Создать пространство" }));
    expect(window.location.pathname).toBe("/spaces/new");
  });

  it("shows the person with a link to the account and a logout button", async () => {
    const onLogout = renderShell("/h/demo-semya-ivanovyh");

    expect(screen.getByRole("link", { name: "Анна Иванова" })).toHaveAttribute("href", "/account");
    await userEvent.click(screen.getByRole("button", { name: "Выйти" }));
    expect(onLogout).toHaveBeenCalled();
  });
});
