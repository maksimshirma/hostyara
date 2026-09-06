import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/packages", "<rootDir>/apps"],
  testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  testPathIgnorePatterns: ["/node_modules/", "/e2e/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/apps/host/src/$1",
    "\\.(css|less|scss|sass)\\?url$": "<rootDir>/jest.cssUrlMock.js",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  collectCoverageFrom: [
    "packages/**/src/**/*.{ts,tsx}",
    "apps/**/src/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/main.tsx",
    "!**/*.stories.tsx",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
};

export default config;
