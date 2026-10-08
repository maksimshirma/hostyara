# @hostyara/demo-budget

A demo remote app (Vue) showing a budget overview and transaction detail
screens. Demonstrates that the platform's `HostSDK`/`AppModule` contract
is framework-agnostic — it runs alongside the React `demo-recipes` app in
the same host, on the same page.

Only the Module Federation transport is wired up for this app today — it
has no dev-harness (standalone) or iframe entry point; use
`apps/demo-recipes` as the reference if you need to see those.

## Installation

From the repo root (Yarn workspaces — this app is not installed standalone):

```bash
corepack enable
yarn install
```

## Usage

```bash
# From the repo root — starts this app together with the host and demo-recipes:
yarn dev

# Or just this app on its own, at http://localhost:5175:
yarn workspace @hostyara/demo-budget dev
```

With the host also running, visit
`http://localhost:3000/h/demo-semya-ivanovyh/a/budget`.

```bash
yarn build   # Rspack production build -> dist/
```
