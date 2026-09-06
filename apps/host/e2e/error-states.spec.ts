import { expect, test } from "@playwright/test";
import { stubRemoteAsFailing } from "./fixtures/remoteStub";

test.describe("remote failure isolation", () => {
  test("a failed remote shows a recoverable error without crashing the chrome", async ({
    page,
  }) => {
    await stubRemoteAsFailing(page, "http://localhost:5174/remoteEntry.js");

    await page.goto("/h/demo-semya-ivanovyh");
    await page.getByRole("link", { name: "Рецепты", exact: true }).click();

    await expect(page.getByText(/Не удалось загрузить «Рецепты»/)).toBeVisible();
    // The dock itself must survive the failure — this is what "isolated"
    // means: a bad remote takes down its own slot, not the shell.
    await expect(page.getByRole("link", { name: "Бюджет" })).toBeVisible();

    await page.unroute("http://localhost:5174/remoteEntry.js");
    await page.getByRole("button", { name: "Повторить" }).click();
    await expect(page.getByRole("heading", { name: "Рецепты" })).toBeVisible();
  });
});
