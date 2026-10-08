import { expect, FULL_ACCESS, test } from "./fixtures/bffStub";

const HOUSEHOLD = "/h/demo-semya-ivanovyh";

test.describe("session", () => {
  test("a signed-out visitor logs in and continues to the address they opened", async ({
    page,
    bff,
  }) => {
    bff.signedIn = false;
    await page.goto(`${HOUSEHOLD}/a/recipes`);

    await page.getByLabel("Почта").fill("demo@example.com");
    await page.getByLabel("Пароль").fill("wrong-password");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page.getByRole("alert")).toHaveText("Неверная почта или пароль");

    await page.getByLabel("Пароль").fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page.getByRole("heading", { name: "Рецепты" })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${HOUSEHOLD}/a/recipes$`));
  });

  test("logging out returns to the login screen", async ({ page }) => {
    await page.goto(HOUSEHOLD);

    await page.getByRole("button", { name: "Выйти" }).click();

    await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
  });
});

test.describe("access", () => {
  test("an app without a grant is not loaded; access can be requested", async ({ page, bff }) => {
    bff.access = { ...FULL_ACCESS, grants: { budget: "edit" } };
    const remoteRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().startsWith("http://localhost:5174/")) remoteRequests.push(request.url());
    });

    await page.goto(`${HOUSEHOLD}/a/recipes`);

    await expect(page.getByText("У вас нет доступа к «Рецепты»")).toBeVisible();
    expect(remoteRequests).toEqual([]);

    await page.getByRole("button", { name: "Запросить редактирование" }).click();
    await expect(page.getByText(/Запрос доступа к «Рецепты» отправлен/)).toBeVisible();
    expect(bff.grantRequests).toEqual([{ hid: "demo", appId: "recipes", requestedLevel: "edit" }]);
  });

  test("the dock lists only apps installed in the household", async ({ page, bff }) => {
    bff.access = { ...FULL_ACCESS, installedApps: ["budget"], grants: { budget: "edit" } };

    await page.goto(HOUSEHOLD);

    await expect(page.getByRole("link", { name: "Бюджет" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Рецепты", exact: true })).toHaveCount(0);
  });
});
