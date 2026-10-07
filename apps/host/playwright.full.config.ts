import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Full stack, local only: host + BFF + identity-service + real app backends.
// identity-service must already be running (PORT=3001, TRUSTED_ORIGINS=
// http://localhost:3000, BFF_WEBHOOK_URL=http://localhost:4001/webhooks/access-changed)
// along with both Postgres instances — see apps/host/README.md.
const baseServers = Array.isArray(base.webServer)
  ? base.webServer
  : base.webServer
    ? [base.webServer]
    : [];

export default defineConfig({
  ...base,
  testDir: "./e2e-full",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalSetup: "./e2e-full/global-setup.ts",
  webServer: [
    ...baseServers,
    {
      command: "yarn workspace @hostyara/bff dev",
      cwd: "../..",
      url: "http://localhost:4000/health",
      reuseExistingServer: true,
      timeout: 60 * 1000,
    },
  ],
});
