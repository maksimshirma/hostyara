import { expect, test } from "@playwright/test";

const HOUSEHOLD = "/h/demo-semya-ivanovyh";

test.describe("cross-app navigation", () => {
  test("dock click mounts an app without a full page reload", async ({ page }) => {
    await page.goto(HOUSEHOLD);

    await page.getByRole("link", { name: "Рецепты", exact: true }).click();

    await expect(page.getByRole("link", { name: "Рецепты", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page).toHaveURL(/\/a\/recipes$/);
    await expect(page.getByRole("heading", { name: "Рецепты" })).toBeVisible();
  });

  test("a deep link cold-starts the right app directly", async ({ page }) => {
    await page.goto(`${HOUSEHOLD}/a/budget`);

    await expect(page.getByRole("link", { name: "Бюджет" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("heading", { name: "Бюджет" })).toBeVisible();
  });

  test("browser Back/Forward work predictably across app boundaries", async ({ page }) => {
    // Two real pushed entries on top of the household home, so Back has
    // somewhere meaningful to land rather than the tab's initial blank
    // page: home -> recipes/8421 -> budget.
    await page.goto(HOUSEHOLD);
    await page.getByRole("link", { name: "Рецепты", exact: true }).click();
    await page.getByRole("link", { name: "Паста карбонара" }).click();
    await expect(page).toHaveURL(/\/r\/8421$/);

    await page.getByRole("link", { name: "Бюджет" }).click();
    await expect(page).toHaveURL(/\/a\/budget$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/r\/8421$/);
    await expect(page.getByRole("heading", { name: "Рецепт №8421" })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/\/a\/budget$/);
    await expect(page.getByRole("heading", { name: "Бюджет" })).toBeVisible();
  });

  test("a series of pushes and an equal run of Backs land exactly back at the start (T19)", async ({
    page,
  }) => {
    const visited: string[] = [];
    const recordUrl = () => visited.push(new URL(page.url()).pathname);

    await page.goto(HOUSEHOLD);
    recordUrl();
    await page.getByRole("link", { name: "Рецепты", exact: true }).click();
    recordUrl();
    await page.getByRole("link", { name: "Паста карбонара" }).click();
    recordUrl();
    await page.getByRole("link", { name: "Бюджет" }).click();
    recordUrl();
    await page.getByRole("link", { name: "Продукты" }).click();
    recordUrl();

    // visited[0] is the starting point, not a destination a Back should
    // ever land back on before the loop below returns to it explicitly.
    for (let i = visited.length - 1; i > 0; i--) {
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`${visited[i - 1]}$`));
    }
  });

  test("a filter change uses replace and doesn't grow history", async ({ page }) => {
    await page.goto(HOUSEHOLD);
    await page.getByRole("link", { name: "Рецепты", exact: true }).click();
    await expect(page).toHaveURL(/\/a\/recipes$/);
    const lengthBeforeFilter = await page.evaluate(() => window.history.length);

    await page.getByRole("button", { name: "завтрак" }).click();
    await expect(page.getByRole("link", { name: "Омлет" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Паста карбонара" })).toHaveCount(0);

    expect(await page.evaluate(() => window.history.length)).toBe(lengthBeforeFilter);

    // Replace overwrote the /a/recipes entry rather than adding to it, so
    // Back skips the unfiltered list entirely and lands on the entry
    // before it — the household home this test started from.
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${HOUSEHOLD}$`));
  });
});

test.describe("iframe transport (T16/T17)", () => {
  test("recipes runs identically under the iframe transport", async ({ page }) => {
    await page.goto(`${HOUSEHOLD}/a/recipes-iframe`);

    const frame = page.frameLocator("iframe");
    await expect(frame.getByRole("heading", { name: "Рецепты" })).toBeVisible();

    await frame.getByRole("link", { name: "Паста карбонара" }).click();
    await expect(page).toHaveURL(/\/a\/recipes-iframe\/r\/8421$/);
    await expect(frame.getByRole("heading", { name: "Рецепт №8421" })).toBeVisible();

    // A single Back must exit the pushed sub-route in one step — the
    // embedded app's own router never touches the iframe's window.history,
    // so there's nothing internal for the browser to unwind first.
    await page.goBack();
    await expect(page).toHaveURL(/\/a\/recipes-iframe$/);
    await expect(frame.getByRole("heading", { name: "Рецепты" })).toBeVisible();
  });
});
