import { expect, test } from "./fixtures/bffStub";

const HOUSEHOLD = "/h/demo-semya-ivanovyh";

test.describe("routing", () => {
  test("a signed-out deep link goes through /login?_from and returns after signing in", async ({
    page,
    bff,
  }) => {
    bff.signedIn = false;
    await page.goto(`${HOUSEHOLD}/settings/members?tab=all`);

    await expect(page).toHaveURL(
      `/login?_from=${encodeURIComponent(`${HOUSEHOLD}/settings/members?tab=all`)}`,
    );
    await page.getByLabel("Почта").fill("demo@example.com");
    await page.getByLabel("Пароль").fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page).toHaveURL(`${HOUSEHOLD}/settings/members?tab=all`);
    await expect(page.getByRole("heading", { level: 1, name: "Участники" })).toBeVisible();
  });

  test("sign-in and sign-up link to each other keeping _from", async ({ page, bff }) => {
    bff.signedIn = false;
    await page.goto(`${HOUSEHOLD}/inbox`);

    await page.getByRole("link", { name: "Зарегистрироваться" }).click();
    await expect(page.getByRole("heading", { name: "Регистрация" })).toBeVisible();
    await expect(page).toHaveURL(`/signup?_from=${encodeURIComponent(`${HOUSEHOLD}/inbox`)}`);

    await page.getByRole("link", { name: "Войти" }).click();
    await expect(page).toHaveURL(`/login?_from=${encodeURIComponent(`${HOUSEHOLD}/inbox`)}`);
  });

  test("/login and / with a session land in the household", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(HOUSEHOLD);

    await page.goto("/");
    await expect(page).toHaveURL(HOUSEHOLD);
    await expect(page.getByRole("heading", { level: 1, name: "Дом" })).toBeVisible();
  });

  test("the side menu reaches every shell section without a reload", async ({ page }) => {
    await page.goto(HOUSEHOLD);
    await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));

    // [menu group, link, path, page heading]
    const sections: Array<[string, string, string, string]> = [
      ["Разделы", "Поиск", "/search", "Поиск"],
      ["Разделы", "Входящие", "/inbox", "Входящие"],
      ["Разделы", "Каталог", "/catalog", "Каталог"],
      ["Пространство", "Настройки", "/settings/general", "Общие"],
      ["Разделы", "Дом", "", "Дом"],
    ];
    for (const [group, link, path, heading] of sections) {
      const item = page
        .getByRole("navigation", { name: group })
        .getByRole("link", { name: link, exact: true });
      await item.click();
      await expect(page).toHaveURL(`${HOUSEHOLD}${path}`);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(item).toHaveAttribute("aria-current", "page");
    }
    expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);
  });

  test("leaving an app for a shell page unloads it", async ({ page }) => {
    await page.goto(`${HOUSEHOLD}/a/recipes`);
    await expect(page.getByRole("heading", { name: "Рецепты" })).toBeVisible();

    await page.getByRole("link", { name: "Поиск", exact: true }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Поиск" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Рецепты" })).toHaveCount(0);
  });

  test("a bare settings address opens its general section", async ({ page }) => {
    await page.goto(`${HOUSEHOLD}/settings`);
    await expect(page).toHaveURL(`${HOUSEHOLD}/settings/general`);
  });

  test("an unknown address shows a 404 — inside the shell only within a household", async ({
    page,
  }) => {
    await page.goto(`${HOUSEHOLD}/no-such-section`);
    await expect(page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Приложения" })).toBeVisible();

    await page.goto("/no-such-page");
    await expect(page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Приложения" })).toHaveCount(0);
  });

  test("a public share link opens without the shell, even for a guest", async ({ page, bff }) => {
    bff.signedIn = false;
    await page.goto("/s/9fKq2m/pasta-carbonara");

    await expect(page).toHaveURL("/s/9fKq2m/pasta-carbonara");
    await expect(page.getByRole("heading", { name: "Публикация" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Зарегистрироваться" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Хлебные крошки" })).toHaveCount(0);
  });
});

test.describe("breadcrumbs", () => {
  test("a recipe shows household / app / recipe and links back up", async ({ page }) => {
    await page.goto(`${HOUSEHOLD}/a/recipes/r/8421`);
    const trail = page.getByRole("navigation", { name: "Хлебные крошки" });

    await expect(trail).toHaveText(/Семья Ивановых.*Рецепты.*Рецепт №8421/);
    await expect(page).toHaveTitle("Рецепт №8421 — Хостяра");

    await trail.getByRole("link", { name: "Рецепты" }).click();
    await expect(page).toHaveURL(/\/a\/recipes$/);
    await expect(trail).not.toContainText("Рецепт №8421");

    await trail.getByRole("link", { name: "Семья Ивановых" }).click();
    await expect(page).toHaveURL(HOUSEHOLD);
    await expect(page.getByRole("heading", { level: 1, name: "Дом" })).toBeVisible();
  });
});

test.describe("narrow screens", () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test("the menu opens from the top bar and closes after navigating", async ({ page }) => {
    await page.goto(HOUSEHOLD);
    await expect(page.getByRole("navigation", { name: "Хлебные крошки" })).toBeHidden();

    await page.getByRole("button", { name: "Меню" }).click();
    await page.getByRole("link", { name: "Входящие", exact: true }).click();

    await expect(page).toHaveURL(`${HOUSEHOLD}/inbox`);
    await expect(page.getByRole("heading", { level: 1, name: "Входящие" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Входящие", exact: true })).toBeHidden();
  });
});
