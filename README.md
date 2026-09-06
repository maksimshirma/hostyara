# Hostyara

A React + TypeScript Yarn Workspaces monorepo for the family super-app host/shell architecture: a shell app (`apps/host`) plus the shared contracts, SDK, design system, lifecycle API, event bus, and app registry that microfrontends will integrate against. Built on Vite with a complete toolchain including Jest, Playwright, Storybook, Oxlint, and Oxfmt.

## Prerequisites

- **Node.js** 20+
- **Corepack** enabled (built-in with Node.js)

## Setup

1. **Enable Corepack** (if not already enabled):

   ```bash
   corepack enable
   ```

2. **Install dependencies**:

   ```bash
   yarn install
   ```

3. **Start development servers** (host + both demo remotes, in parallel):

   ```bash
   yarn dev
   ```

   This runs `yarn workspace @hostyara/host dev`, `yarn workspace @hostyara/demo-recipes dev`, and `yarn workspace @hostyara/demo-budget dev` together via `concurrently`:

   | App                            | URL                     |
   | ------------------------------ | ----------------------- |
   | `@hostyara/host` (shell)       | `http://localhost:3000` |
   | `@hostyara/demo-recipes` (MFE) | `http://localhost:5174` |
   | `@hostyara/demo-budget` (MFE)  | `http://localhost:5175` |

   The host loads both remotes over Module Federation from `apps/host/src/registry/registry.json`, which points at their dev-server `remoteEntry.js` URLs — all three servers need to be running for the shell to actually mount an app. To run just one piece on its own: `yarn workspace @hostyara/host dev`, `yarn workspace @hostyara/demo-recipes dev`, or `yarn workspace @hostyara/demo-budget dev`.

All commands below run from the repo root and operate on the whole workspace unless noted. To target a single package directly: `yarn workspace @hostyara/<name> <script>` (e.g. `yarn workspace @hostyara/host dev`).

## Available Commands

### Development

| Command        | Description                                                             |
| -------------- | ----------------------------------------------------------------------- |
| `yarn dev`     | Start host (Vite, HMR) + demo-recipes and demo-budget (Rspack) together |
| `yarn preview` | Preview the host's production build locally                             |

### Building & Production

`yarn build` only builds the host shell — the two demo remotes are separate Rspack projects and build independently:

| Command                                       | Description                                                    |
| --------------------------------------------- | -------------------------------------------------------------- |
| `yarn build`                                  | TypeScript check + Vite build of the host to `apps/host/dist/` |
| `yarn workspace @hostyara/demo-recipes build` | Rspack production build to `apps/demo-recipes/dist/`           |
| `yarn workspace @hostyara/demo-budget build`  | Rspack production build to `apps/demo-budget/dist/`            |
| `yarn typecheck`                              | Run TypeScript type checking across the workspace (non-emit)   |

For a full production build, run all three and deploy each `dist/` to its own static host/CDN — the host's `registry.json` needs the remotes' deployed `remoteEntry.js` URLs (and, for `demo-recipes`, its `iframe.html` if using the iframe transport) updated to match wherever they end up, since dev points them at `localhost:5174`/`localhost:5175`.

### Testing

| Command           | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `yarn test`       | Run Jest unit tests                                   |
| `yarn test:watch` | Jest in watch mode                                    |
| `yarn e2e`        | Run Playwright E2E tests (starts host + both remotes) |
| `yarn e2e:ui`     | Run E2E tests with Playwright UI                      |

### Code Quality

| Command             | Description                      |
| ------------------- | -------------------------------- |
| `yarn lint`         | Run Oxlint (linter)              |
| `yarn lint:fix`     | Fix linting issues automatically |
| `yarn format`       | Format code with Oxfmt           |
| `yarn format:check` | Check formatting without changes |

### Storybook

| Command                | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `yarn storybook`       | Start Storybook at `http://localhost:6006`       |
| `yarn build-storybook` | Build Storybook to `apps/host/storybook-static/` |

## Git Hooks

Husky is configured with three automatic hooks:

- **pre-commit**: Runs linting (`yarn lint`) and format check (`yarn format:check`)
- **commit-msg**: Validates commit message follows [Conventional Commits](https://www.conventionalcommits.org/)
- **pre-push**: Runs type checking (`yarn typecheck`) and tests (`yarn test`)

If a hook fails, fix the issue and try again. To bypass hooks (not recommended):

```bash
git commit --no-verify
git push --no-verify
```

## Project Structure

```
hostyara/
├── packages/
│   ├── contracts/            # @hostyara/contracts — shared typed contracts/schemas
│   ├── sdk/                  # @hostyara/sdk — public Host SDK (auth, navigation, notifications, feature flags, permissions)
│   ├── ui/                   # @hostyara/ui — design system (tokens, theme, React components)
│   ├── lifecycle/            # @hostyara/lifecycle — microfrontend lifecycle API
│   ├── event-bus/            # @hostyara/event-bus — typed host<->app pub/sub (skeleton)
│   └── registry/             # @hostyara/registry — in-memory app metadata registry
├── apps/
│   └── host/                 # @hostyara/host — the shell app
│       ├── src/              # App source (main.tsx, App.tsx, ...)
│       ├── e2e/              # Playwright E2E tests
│       ├── .storybook/       # Storybook config (also picks up packages/*/src stories)
│       ├── index.html
│       ├── vite.config.ts
│       └── playwright.config.ts
├── types/
│   └── css-modules.d.ts      # shared CSS Modules ambient declaration
├── .husky/                   # Git hooks
├── tsconfig.base.json        # shared strict compilerOptions
├── tsconfig.json             # root workspace-wide typecheck config
├── jest.config.ts            # Jest config (covers packages/ + apps/)
├── jest.setup.ts             # shared Jest setup (jest-dom matchers)
├── .oxlintrc.json            # Oxlint config
├── package.json              # workspace root, shared devDependencies, scripts
└── README.md                 # This file
```

Each package under `packages/*` and `apps/host` has its own minimal `package.json` + `tsconfig.json` (extending `tsconfig.base.json`). Library packages have **no build step** — `main`/`types` point straight at `src/index.ts`; Yarn's workspace symlinks (in `node_modules/@hostyara/*`) let Vite/Jest/tsc resolve and transpile them like any other package, since they're never published, only consumed inside this monorepo.

## Configuration Files

- **`tsconfig.base.json`** / **`tsconfig.json`**: TypeScript strict mode, target ES2022, workspace-wide typecheck via `yarn typecheck`
- **`.oxlintrc.json`**: Oxlint with React and TypeScript plugins, covers the whole workspace
- **`apps/host/vite.config.ts`**: Vite with React Fast Refresh, `@/*` alias, port 3000
- **`jest.config.ts`**: ts-jest preset, jsdom environment, CSS module mocking, discovers tests in `packages/*/src` and `apps/*/src`
- **`apps/host/playwright.config.ts`**: Chromium browser, local dev server integration
- **`apps/host/.storybook/`**: React + Vite framework, autodocs enabled, stories from both `apps/host/src` and `packages/*/src`

## Packages

| Package               | Purpose                                                                                                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@hostyara/contracts` | Shared typed contracts/schemas between host and microfrontends (`User`, `AppManifest`, `HostContext`, `HostSDK`, `MountContext`, `MfeModule`, `RegistryEntry`, `RemoteDescriptor`, `EventBus`, `SharedStateAccessor`) |
| `@hostyara/sdk`       | Public typed Host SDK surface: `AuthSDK`, `NavigationSDK`, `NotificationsSDK`, `FeatureFlagsSDK`, `PermissionsSDK`                                                                                                    |
| `@hostyara/ui`        | Shared design system: tokens, theme, React components (e.g. `Button`)                                                                                                                                                 |
| `@hostyara/lifecycle` | Standardized microfrontend lifecycle API (`bootstrap`/`mount`/`unmount`/`update`/`prefetch`/`destroy`)                                                                                                                |
| `@hostyara/event-bus` | Typed host<->app pub/sub — skeleton only, implementation pending                                                                                                                                                      |
| `@hostyara/registry`  | In-memory `AppRegistry` for app metadata, routes, versions, permissions, health status                                                                                                                                |
| `@hostyara/host`      | The shell app: auth, session, routing, layout, orchestration                                                                                                                                                          |

## Environment

- **Bundler/Dev Server**: Vite
- **Runtime Framework**: React 19
- **Language**: TypeScript 5.9
- **Testing**: Jest + React Testing Library (unit), Playwright (E2E)
- **Documentation**: Storybook
- **Linting**: Oxlint
- **Formatting**: Oxfmt
- **Git Hooks**: Husky

## Troubleshooting

### Vite CJS deprecation warning

The warning about Vite's CJS API is harmless and can be ignored. It occurs because config files use CJS by design (avoids ESM/Jest friction).

### Playwright browser install

If Playwright tests fail with missing browsers:

```bash
npx playwright install --with-deps chromium
```

### Port already in use

If port 3000 is in use, modify `vite.config.ts` or:

```bash
PORT=3001 yarn dev
```
