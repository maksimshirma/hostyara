---
name: run-hostyara
description: Build, run, and drive the Hostyara host/shell app. Use when asked to start hostyara, run its dev server, run unit/e2e tests, typecheck, or take a screenshot / click through its UI.
---

Vite + React 19 app (`apps/host`) plus Yarn workspace packages under `packages/*`. Drive it by starting the Vite dev server, then interacting with it via the `mcp__claude-in-chrome__*` browser tools (this environment has no `chromium-cli` binary — the Chrome extension tools are the equivalent harness here). All paths below are relative to the repo root (`hostyara/`).

## Setup

```bash
corepack enable   # if not already
yarn install
```

`yarn install` also regenerates `node_modules/@hostyara/*` workspace symlinks — required if a package under `packages/*` was ever renamed (see Gotchas).

## Build / typecheck

```bash
yarn typecheck   # tsc --noEmit, workspace-wide
yarn build       # typecheck + vite build -> apps/host/dist/
```

## Run (agent path)

Start the dev server in the background and poll the port instead of sleeping:

```bash
(yarn dev > /tmp/hostyara-dev.log 2>&1 &)
i=0; until curl -sf http://localhost:3000 >/dev/null || [ $i -ge 30 ]; do sleep 1; i=$((i+1)); done
```

Stop it with `pkill -f 'vite'` (or kill the `node .../vite/bin/vite.js` pid — `yarn dev`'s own pid is a wrapper and killing it alone leaves vite running).

Then drive it with the browser tools (load them first if deferred: `ToolSearch` `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_console_messages`):

1. `tabs_context_mcp{createIfEmpty:true}` — get a tab id.
2. `navigate{url:"http://localhost:3000", tabId}`.
3. `computer{action:"screenshot", tabId}` — confirms render. Page shows "Welcome to Hostyara", a purple "Click me" button, and a `role="radiogroup"` theme switcher (`system` / `light` / `dark`) with "Active theme: <theme>" text below it.
4. To prove interactivity: `computer{action:"left_click", coordinate:[<light-button-x>,<light-button-y>], tabId}` then screenshot again — background flips dark/light and the "Active theme:" text updates. Coordinates come from the screenshot; the theme buttons sit in a row starting ~x=707, y=151 at default viewport size.
5. `read_console_messages{tabId, pattern:"error|Error|failed", onlyErrors:true}` — confirm no thrown errors.

## Run (human path)

```bash
yarn dev   # -> http://localhost:3000, Ctrl-C to stop
```

## Test

```bash
yarn test    # Jest, unit — 9 suites / 33 tests pass
yarn e2e     # Playwright — reuses the already-running dev server (reuseExistingServer: !CI), 2 tests pass
```

## Gotchas

- **Stale `node_modules/@hostyara/*` symlinks after a package rename.** `packages/contract` was previously `packages/contracts`; the workspace symlink at `node_modules/@hostyara/contracts` still pointed at the old (now nonexistent) path, breaking `import { ... } from "@hostyara/contract"` with `TS2307: Cannot find module` across `typecheck`, `test`, and `build`. Fix: `yarn install` regenerates the symlinks from the current `packages/*/package.json` names. If you hit `TS2307` for an `@hostyara/*` import, run `yarn install` before debugging further.
- **`yarn dev`'s pid is not the vite process.** It's a wrapper (`node .../bin/yarn dev`); the actual server is a child `node .../vite/bin/vite.js`. `kill` on the wrapper pid alone can leave the port bound. Use `pkill -f vite` to be sure.
- **`yarn e2e` reuses port 3000** if a dev server is already up (`reuseExistingServer: !process.env.CI` in `apps/host/playwright.config.ts`) — no need to stop your manually-started dev server before running it.
