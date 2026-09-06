import { expect, test } from "@playwright/test";

const HOUSEHOLD = "/h/demo-semya-ivanovyh";

test.describe("Content Security Policy (T24)", () => {
  test("the shell response carries a CSP header derived from the registry", async ({ page }) => {
    const response = await page.goto(HOUSEHOLD);
    const header = response?.headers()["content-security-policy"];

    expect(header).toBeTruthy();
    expect(header).toContain("default-src 'self'");
    expect(header).toContain("http://localhost:5174");
    expect(header).toContain("http://localhost:5175");
  });

  test("a request to a domain no installed app declared is blocked", async ({ page }) => {
    await page.goto(HOUSEHOLD);

    const violations: string[] = [];
    page.on("console", (message) => {
      if (message.text().includes("Content Security Policy")) violations.push(message.text());
    });

    const result = await page.evaluate(async () => {
      try {
        await fetch("https://evil.example.com/");
        return "resolved";
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    });

    expect(result).not.toBe("resolved");
    expect(violations.some((text) => text.includes("evil.example.com"))).toBe(true);
  });

  test("a request to a declared remote's own origin is not blocked by CSP", async ({ page }) => {
    await page.goto(HOUSEHOLD);

    const violations: string[] = [];
    page.on("console", (message) => {
      if (message.text().includes("Content Security Policy")) violations.push(message.text());
    });

    // The path doesn't need to exist — this only asserts CSP doesn't
    // block the connect attempt to a declared origin, not that the
    // request itself succeeds.
    await page.evaluate(async () => {
      try {
        await fetch("http://localhost:5174/mf-manifest.json");
      } catch {
        // A network-level failure is fine here; a CSP violation isn't.
      }
    });

    expect(violations).toHaveLength(0);
  });
});
