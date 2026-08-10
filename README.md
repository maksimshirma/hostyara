# Hostyara

A modern React + TypeScript frontend for the family super-app host/shell application. Built on Vite with a complete toolchain including Jest, Playwright, Storybook, Oxlint, and Oxfmt.

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

3. **Start development server**:

   ```bash
   yarn dev
   ```

   App runs at `http://localhost:3000`

## Available Commands

### Development

| Command        | Description                      |
| -------------- | -------------------------------- |
| `yarn dev`     | Start Vite dev server with HMR   |
| `yarn preview` | Preview production build locally |

### Building & Production

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `yarn build`     | TypeScript check + Vite build to `dist/` |
| `yarn typecheck` | Run TypeScript type checking (non-emit)  |

### Testing

| Command           | Description                                  |
| ----------------- | -------------------------------------------- |
| `yarn test`       | Run Jest unit tests                          |
| `yarn test:watch` | Jest in watch mode                           |
| `yarn e2e`        | Run Playwright E2E tests (starts dev server) |
| `yarn e2e:ui`     | Run E2E tests with Playwright UI             |

### Code Quality

| Command             | Description                      |
| ------------------- | -------------------------------- |
| `yarn lint`         | Run Oxlint (linter)              |
| `yarn lint:fix`     | Fix linting issues automatically |
| `yarn format`       | Format code with Oxfmt           |
| `yarn format:check` | Check formatting without changes |

### Storybook

| Command                | Description                                |
| ---------------------- | ------------------------------------------ |
| `yarn storybook`       | Start Storybook at `http://localhost:6006` |
| `yarn build-storybook` | Build Storybook to `storybook-static/`     |

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
├── src/
│   ├── components/          # Reusable React components
│   │   └── Button/          # Example component with stories and tests
│   ├── App.tsx              # Root app component
│   ├── App.module.css       # App styling
│   ├── index.css            # Global styles
│   ├── main.tsx             # Vite entry point
│   ├── setupTests.ts        # Jest configuration
│   └── vite-env.d.ts        # TypeScript ambient declarations
├── e2e/                     # Playwright E2E tests
├── .storybook/              # Storybook configuration
├── .husky/                  # Git hooks
├── vite.config.ts           # Vite configuration
├── jest.config.ts           # Jest configuration
├── playwright.config.ts     # Playwright configuration
├── tsconfig.json            # TypeScript config
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

## Configuration Files

- **`tsconfig.json`**: TypeScript strict mode enabled, target ES2022, path aliases (`@/*`)
- **`.oxlintrc.json`**: Oxlint with React and TypeScript plugins
- **`vite.config.ts`**: Vite with React Fast Refresh, path aliases, port 3000
- **`jest.config.ts`**: ts-jest preset, jsdom environment, CSS module mocking
- **`playwright.config.ts`**: Chromium browser, local dev server integration
- **`.storybook/`**: React + Vite framework, autodocs enabled

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
