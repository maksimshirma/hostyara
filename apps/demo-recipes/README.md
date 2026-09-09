# @hostyara/demo-recipes

A demo remote app (React) showing a recipe list and recipe detail screens.
Serves as the reference implementation for a hostyara microfrontend — it's
the only demo app wired up for all three mount transports (Module
Federation, iframe, and standalone via the dev-harness); `demo-budget`
only implements Module Federation.

## Installation

From the repo root (Yarn workspaces — this app is not installed standalone):

```bash
corepack enable
yarn install
```

## Usage

```bash
# From the repo root — starts this app together with the host and demo-budget:
yarn dev

# Or just this app on its own, at http://localhost:5174:
yarn workspace @hostyara/demo-recipes dev
```

Three ways to view it running:

- **Through the host**: with the host also running, visit
  `http://localhost:3000/h/demo-semya-ivanovyh/a/recipes`.
- **Standalone, no host**: `http://localhost:5174/standalone.html` (the
  dev-harness — see [docs/quickstart.md](../../docs/quickstart.md)).
- **Via iframe transport**: `http://localhost:3000/h/demo-semya-ivanovyh/a/recipes-iframe`
  (registered as a separate `mount.type: "iframe"` entry in
  `apps/host/src/registry/registry.json`).

```bash
yarn build   # Rspack production build -> dist/
```
