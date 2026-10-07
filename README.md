# Hostyara

A TypeScript Yarn Workspaces monorepo for a family super-app host/shell
architecture: a shell app (`apps/host`, React + Vite) that mounts independent
microfrontends over Module Federation (or an iframe, for isolation) — plus
two demo remotes on different frameworks (`apps/demo-recipes`, React;
`apps/demo-budget`, Vue) and the shared packages they all build against
(contracts, SDK types, design system, lifecycle, conformance suite,
dev-harness, framework router adapters). See **[docs/](./docs/)** for the
platform reference (SDK, manifest format, URL scheme, how to build your own
subapp) and **[docs/demo-script.md](./docs/demo-script.md)** for a guided
walkthrough of what the platform actually does end to end.

## Prerequisites

- **Node.js** 22.12+ (the BFF loads ESM-only dependencies through `require`)
- **Corepack** enabled (built-in with Node.js)
- **Docker** — Postgres for the BFF (`apps/bff/docker-compose.yml`)
- **identity-service** checked out next to this repo (`../identity-service`) — the shell has no login without it

## Setup

1. **Enable Corepack** (if not already enabled):

   ```bash
   corepack enable
   ```

2. **Install dependencies**:

   ```bash
   yarn install
   ```

3. **Start identity-service and the BFF's database** (once per machine — see each README):

   ```bash
   # in ../identity-service: its own Postgres, migrations, then
   PORT=3001 TRUSTED_ORIGINS=http://localhost:3000 \
     BFF_WEBHOOK_URL=http://localhost:4001/webhooks/access-changed pnpm dev

   # here:
   cd apps/bff && cp .env.example .env && docker compose up -d && yarn db:migrate && cd ../..
   ```

4. **Start development servers** (host, BFF and both demo remotes, in parallel):

   ```bash
   yarn dev
   ```

   This runs the host, `@hostyara/bff`, `@hostyara/demo-recipes` and `@hostyara/demo-budget` together via `concurrently`:

   | App                            | URL                                                    |
   | ------------------------------ | ------------------------------------------------------ |
   | `@hostyara/host` (shell)       | `http://localhost:3000`                                |
   | `@hostyara/bff`                | `http://localhost:4000` (proxied under :3000), `:4001` |
   | `@hostyara/demo-recipes` (MFE) | `http://localhost:5174`                                |
   | `@hostyara/demo-budget` (MFE)  | `http://localhost:5175`                                |

   Open `http://localhost:3000`, register, and create a household. The host's
   Vite server forwards `/auth`, `/identity` and `/api` to the BFF, so the
   browser only ever talks to `:3000`. Apps open once they are installed in the
   household and you hold a grant (see `apps/bff/README.md` for registering app
   backends).

   The host loads both remotes over Module Federation from `apps/host/src/registry/registry.json`, which points at their dev-server `remoteEntry.js` URLs — all three servers need to be running for the shell to actually mount an app. To run just one piece on its own: `yarn workspace @hostyara/host dev`, `yarn workspace @hostyara/demo-recipes dev`, or `yarn workspace @hostyara/demo-budget dev`.

All commands below run from the repo root and operate on the whole workspace unless noted. To target a single package directly: `yarn workspace @hostyara/<name> <script>` (e.g. `yarn workspace @hostyara/host dev`).

## Available Commands

### Development

| Command        | Description                                                                               |
| -------------- | ----------------------------------------------------------------------------------------- |
| `yarn dev`     | Start host (Vite, HMR) + BFF (tsx watch) + demo-recipes and demo-budget (Rspack) together |
| `yarn preview` | Preview the host's production build locally                                               |

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

| Command                 | Description                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `yarn test`             | Run Jest unit tests                                                                                                      |
| `yarn test:watch`       | Jest in watch mode                                                                                                       |
| `yarn test:integration` | BFF integration tests against its Postgres (`apps/bff`)                                                                  |
| `yarn e2e`              | Run Playwright E2E tests (starts host + both remotes; the BFF is stubbed)                                                |
| `yarn e2e:ui`           | Run E2E tests with Playwright UI                                                                                         |
| `yarn e2e:full`         | Full-stack Playwright run: host + BFF + identity-service + JWT-verifying app backends (local; see `apps/host/README.md`) |

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

## Continuous Integration

`.github/workflows/pr-checks.yml` runs on every PR: typecheck, lint, format
check, unit tests, a dedicated conformance job (both demo apps), Playwright
e2e, and a production build (host + both demo remotes) whose `dist/`
outputs are uploaded as a build artifact. `.github/workflows/build.yml`
rebuilds the host on every push to `master`.

## Project Structure

```
hostyara/
├── packages/
│   ├── contracts/            # @hostyara/contracts — AppModule, HostSDK, AppManifest, ...
│   ├── sdk/                  # @hostyara/sdk — re-exports the contracts' SDK types
│   ├── ui/                   # @hostyara/ui — design system (tokens, theme, React components)
│   ├── lifecycle/            # @hostyara/lifecycle — createLifecycle(mount/unmount) helper
│   ├── event-bus/            # @hostyara/event-bus — HostChannel (in-memory + MessagePort)
│   ├── registry/             # @hostyara/registry — AppRegistry (resolve by id, contract check)
│   ├── conformance/          # @hostyara/conformance — the AppModule conformance suite
│   ├── dev-harness/          # @hostyara/dev-harness — run a remote standalone, no host
│   ├── iframe-embed/         # @hostyara/iframe-embed — HostSDK proxy for the iframe transport
│   ├── router-react/         # @hostyara/router-react — sdk.router -> React Router history
│   └── router-vue/           # @hostyara/router-vue — sdk.router -> Vue Router history
├── apps/
│   ├── host/                 # @hostyara/host — the shell app (Vite)
│   │   ├── src/              # router, chrome, registry, mount-manager, csp, observability, ...
│   │   ├── e2e/               # Playwright E2E tests
│   │   ├── .storybook/       # Storybook config (also picks up packages/*/src stories)
│   │   └── vite.config.ts
│   ├── demo-recipes/         # @hostyara/demo-recipes — React remote (Rspack)
│   └── demo-budget/          # @hostyara/demo-budget — Vue remote (Rspack)
├── docs/                     # Platform reference + demo script — see docs/README.md
├── .github/workflows/        # CI: typecheck, lint, format, unit, conformance, e2e, build
├── types/
│   └── css-modules.d.ts      # shared CSS Modules ambient declaration
├── .husky/                   # Git hooks
├── tsconfig.base.json        # shared strict compilerOptions
├── tsconfig.json             # root typecheck config (covers packages/*/src + apps/host/src only —
│                              # demo-recipes/demo-budget have their own tsconfig, type-checked via
│                              # ts-jest at test time, not by root `yarn typecheck`)
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

See **[docs/](./docs/)** for the full reference on any of these; this table
is just a map of where to look.

| Package                  | Purpose                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `@hostyara/contracts`    | The canonical types: `AppModule`, `HostSDK`, `AppManifest`, and their component pieces                                   |
| `@hostyara/sdk`          | Re-exports the same SDK-related types from `@hostyara/contracts` for convenience                                         |
| `@hostyara/ui`           | Shared design system: tokens, theme, React components (e.g. `Button`)                                                    |
| `@hostyara/lifecycle`    | `createLifecycle()` — a tiny helper for defining an `AppModule` with partial overrides                                   |
| `@hostyara/event-bus`    | `HostChannel` request/on RPC — in-memory and `MessagePort` (cross-realm/iframe) implementations                          |
| `@hostyara/registry`     | `AppRegistry` — resolves an app id to its manifest, enforcing the contract major version                                 |
| `@hostyara/conformance`  | The `AppModule` conformance suite every app runs from its own Jest test — see [docs/app-module.md](./docs/app-module.md) |
| `@hostyara/dev-harness`  | Runs a remote's `AppModule` standalone (own shadow root, own history) — no host needed                                   |
| `@hostyara/iframe-embed` | `HostSDK` proxy + handshake for apps mounted via the iframe transport instead of Module Federation                       |
| `@hostyara/router-react` | Adapts `sdk.router` to React Router's `history` interface                                                                |
| `@hostyara/router-vue`   | Adapts `sdk.router` to Vue Router's `history` interface                                                                  |
| `@hostyara/host`         | The shell app: session, routing, mount manager, remote loader, CSP generation, observability                             |
| `@hostyara/bff`          | Backend-for-frontend: server-side sessions, identity-service proxy, gateway to app backends, live access events          |
| `@hostyara/demo-recipes` | React remote demonstrating all three transports (Module Federation, iframe, standalone)                                  |
| `@hostyara/demo-budget`  | Vue remote demonstrating Module Federation (no iframe/standalone entry yet)                                              |

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

Ports are hardcoded, not read from an environment variable: `3000` for the
host (identity-service therefore runs on `3001`; the BFF uses `4000`/`4001`) (`apps/host/vite.config.ts`'s `server.port`), `5174` for demo-recipes
and `5175` for demo-budget (each app's own `rspack.config.mjs`'s
`devServer.port`). If one is in use, edit the relevant config file directly
— `PORT=... yarn dev` has no effect.
