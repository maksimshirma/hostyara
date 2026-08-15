import { test, expect } from "@playwright/test";

test("homepage loads and contains expected content", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Hostyara/i);
  await expect(page.locator("h1")).toContainText("Welcome to Hostyara");
  await expect(page.locator("p").first()).toContainText("Host/shell application");
});

test("button is clickable", async ({ page }) => {
  await page.goto("/");

  const button = page.locator("button", { hasText: /click me/i });
  await expect(button).toBeVisible();
  await button.click();
});
