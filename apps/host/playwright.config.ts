import path from "path";
import { defineConfig, devices } from "@playwright/test";

const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Real cross-app navigation and the iframe transport need actual remotes
  // running, not just the host's own shell — each dev server started and
  // awaited independently so a slow remote doesn't fail as "host isn't up".
  webServer: [
    {
      command: "yarn workspace @hostyara/host dev",
      cwd: repoRoot,
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: "yarn workspace @hostyara/demo-recipes dev",
      cwd: repoRoot,
      url: "http://localhost:5174/remoteEntry.js",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: "yarn workspace @hostyara/demo-budget dev",
      cwd: repoRoot,
      url: "http://localhost:5175/remoteEntry.js",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
