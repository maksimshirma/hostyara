import type { Config } from "jest";

// Integration suite: needs this app's Postgres (docker compose up -d). Kept
// out of the root unit run, which CI executes without a database.
const config: Config = {
  rootDir: ".",
  // Transpile only — types are checked by `yarn typecheck`; ts-jest's own
  // checker does not resolve package subpath exports under NodeNext.
  // kysely ships ESM only, so it goes through the same transform.
  transform: {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      { tsconfig: { allowJs: true, module: "commonjs", isolatedModules: true } },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!(kysely|jose)/)"],
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/__jest__/**/*.integration.test.ts"],
  globalSetup: "<rootDir>/src/test/global-setup.ts",
  maxWorkers: 1,
  testTimeout: 30_000,
};

export default config;
