import { expect, test } from "./fixtures/bffStub";

const HOUSEHOLD = "/h/demo-semya-ivanovyh";

// The host router must never rewrite what belongs to an app (IA §3) and
// must stay the only writer to window.history (IA §9).
test.describe("host history", () => {
  test("an app's query reaches the address bar byte for byte", async ({ page }) => {
    const address = `${HOUSEHOLD}/a/recipes?servings=4&tag=%22a%22&q=a+b&q=c#steps`;
    await page.goto(address);
    await expect(page.getByRole("heading", { name: "Рецепты" })).toBeVisible();
    await page.waitForTimeout(300);

    expect(
      new URL(page.url()).pathname + new URL(page.url()).search + new URL(page.url()).hash,
    ).toBe(address);
  });

  test("Back restores an app address exactly as it was", async ({ page }) => {
    await page.goto(`${HOUSEHOLD}/a/recipes?tag=%D1%83%D0%B6%D0%B8%D0%BD`);
    await page.getByRole("link", { name: "Паста карбонара" }).click();
    await expect(page).toHaveURL(/\/r\/8421$/);

    await page.goBack();

    await expect(page).toHaveURL(`${HOUSEHOLD}/a/recipes?tag=%D1%83%D0%B6%D0%B8%D0%BD`);
  });

  test("the host's own navigation never trips the dev history guard", async ({ page }) => {
    const warnings: string[] = [];
    page.on("console", (message) => {
      if (message.text().includes("[hostyara]")) warnings.push(message.text());
    });

    await page.goto(HOUSEHOLD);
    await page.getByRole("link", { name: "Рецепты", exact: true }).click();
    await page.getByRole("link", { name: "Паста карбонара" }).click();
    await page.getByRole("link", { name: "Бюджет" }).click();
    await page.goBack();
    await page.getByRole("link", { name: "Поиск", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Поиск" })).toBeVisible();

    expect(warnings).toEqual([]);
  });

  test.describe("scroll restoration", () => {
    // Shell stubs and demo apps are short; a tall body makes the page scroll.
    async function makePageTall(page: import("@playwright/test").Page) {
      await page.evaluate(() => {
        document.body.style.minHeight = "4000px";
      });
    }

    async function scrollTo(page: import("@playwright/test").Page, y: number) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(y);
    }

    test("Back from an app returns to where the shell page was scrolled", async ({ page }) => {
      await page.goto(`${HOUSEHOLD}/search`);
      await expect(page.getByRole("heading", { level: 1, name: "Поиск" })).toBeVisible();
      await makePageTall(page);
      await scrollTo(page, 800);

      await page.getByRole("link", { name: "Рецепты", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Рецепты" })).toBeVisible();
      await page.goBack();

      await expect(page).toHaveURL(`${HOUSEHOLD}/search`);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(800);
    });

    test("Back between apps returns to the first app's position", async ({ page }) => {
      await page.goto(`${HOUSEHOLD}/a/recipes`);
      await expect(page.getByRole("heading", { name: "Рецепты" })).toBeVisible();
      await makePageTall(page);
      await scrollTo(page, 600);

      await page.getByRole("link", { name: "Бюджет" }).click();
      await expect(page.getByRole("heading", { name: "Бюджет" })).toBeVisible();
      await page.goBack();

      await expect(page).toHaveURL(`${HOUSEHOLD}/a/recipes`);
      await expect(page.getByRole("heading", { name: "Рецепты" })).toBeVisible();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);
    });
  });
});
