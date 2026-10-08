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

- **Through the host**: with the host, BFF and identity-service running, sign
  in, install the app in your household and open `/h/<hid>/a/recipes`.
- **Standalone, no host**: `http://localhost:5174/standalone.html` (the
  dev-harness — see [docs/quickstart.md](../../docs/quickstart.md)).
- **Via iframe transport**: `/h/<hid>/a/recipes-iframe`
  (registered as a separate `mount.type: "iframe"` entry in
  `apps/host/src/registry/registry.json`).

```bash
yarn build   # Rspack production build -> dist/
```

The recipe list has a **«Проверить бэкенд»** button: an `sdk.api.request`
to the app's own backend (`/ping`) through the host and the BFF, showing the
`aud`/`scope` the backend saw in its token. The app derives its own id
(`recipes` or `recipes-iframe`) from `sdk.basename` (`src/sdkContext.tsx`), so
the same code works under both transports. Without a registered backend (or
standalone) it shows the `SdkApiError` code instead.

## Breadcrumbs

The screens publish their part of the host's breadcrumb trail through
`sdk.nav`: the recipe screen adds `Рецепт №<id>` after the shell's
"household / Рецепты" and sets the page title; the list clears the tail.

```tsx
const sdk = useSdk();
useEffect(() => {
  sdk.nav.setBreadcrumbs([{ label: `Рецепт №${id}` }]);
  sdk.nav.setTitle(`Рецепт №${id}`);
}, [sdk, id]);
```
