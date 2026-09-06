# Quickstart: build a subapp in 15 minutes

This walks through building a minimal, fully compliant remote app —
without needing the host running at all — using the dev-harness. Every
command and file below was verified against this repo before being
written down.

## 1. Scaffold the workspace (2 min)

Pick a short id for your app (`notes` in this example) and create
`apps/notes/`:

```
apps/notes/
  package.json
  tsconfig.json
  rspack.config.mjs
  src/
    index.ts
    dev-harness-entry.ts
    App.module.css
```

`package.json`:

```json
{
  "name": "@hostyara/notes",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "rspack serve",
    "build": "rspack build"
  },
  "dependencies": {
    "@hostyara/contracts": "workspace:^",
    "@hostyara/dev-harness": "workspace:^",
    "@hostyara/lifecycle": "workspace:^"
  },
  "devDependencies": {
    "@hostyara/conformance": "workspace:^",
    "@module-federation/enhanced": "^2.9.0",
    "@rspack/cli": "^2.2.2",
    "@rspack/core": "^2.2.2",
    "@rspack/dev-server": "^2.2.1"
  }
}
```

`tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["src"]
}
```

Because `apps/*` is already a workspace glob in the root `package.json`,
`yarn install` from the repo root picks up the new package automatically
— no root config changes needed.

## 2. Write your `AppModule` (5 min)

`src/App.module.css` — start with `:host`, because you'll be mounted into
a shadow root:

```css
:host {
  display: block;
  font-family: sans-serif;
  padding: 1rem;
}
```

`src/index.ts` — the actual contract from
[app-module.md](./app-module.md):

```ts
import { AppModule, HostSDK } from "@hostyara/contracts";
import styles from "./App.module.css";

const unsubscribes = new WeakMap<HTMLElement, () => void>();

function render(el: HTMLElement, sdk: HostSDK): void {
  el.className = styles.root ?? "";
  el.textContent = `path: ${sdk.router.location.pathname}`;
}

const appModule: AppModule = {
  mount(el, sdk) {
    render(el, sdk);
    const unsubscribe = sdk.router.subscribe(() => render(el, sdk));
    unsubscribes.set(el, unsubscribe);
  },
  unmount(el) {
    unsubscribes.get(el)?.();
    unsubscribes.delete(el);
    el.textContent = "";
  },
};

export default appModule;
```

Note `unmount` always unsubscribes and clears the element — this is what
makes mount/unmount idempotent (see [app-module.md](./app-module.md)).

## 3. Wire up the dev-harness entry (2 min)

`src/dev-harness-entry.ts`:

```ts
import { runDevHarness } from "@hostyara/dev-harness";
import appModule from "./index";

void runDevHarness(appModule, { appId: "notes" });
```

`rspack.config.mjs`:

```js
import { ModuleFederationPlugin } from "@module-federation/enhanced/rspack";
import { rspack } from "@rspack/core";

const isProduction = process.env.NODE_ENV === "production";

export default {
  mode: isProduction ? "production" : "development",
  entry: {
    devHarness: "./src/dev-harness-entry.ts",
  },
  output: {
    publicPath: "http://localhost:5199/",
    uniqueName: "notes",
    filename: isProduction ? "[name].[contenthash].js" : "[name].js",
    cssFilename: isProduction ? "[name].[contenthash].css" : "[name].css",
  },
  devServer: {
    port: 5199, // pick a port not already used by another app
    headers: { "Access-Control-Allow-Origin": "*" },
  },
  resolve: { extensions: [".ts", ".js"] },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: "builtin:swc-loader",
          options: { jsc: { parser: { syntax: "typescript" } } },
        },
        type: "javascript/auto",
      },
      { test: /\.module\.css$/, type: "css/module", parser: { namedExports: false } },
    ],
  },
  experiments: { css: true },
  plugins: [
    new ModuleFederationPlugin({
      name: "notes",
      filename: isProduction ? "remoteEntry.[contenthash].js" : "remoteEntry.js",
      exposes: { "./app": "./src/index.ts" },
      dts: false,
    }),
    new rspack.HtmlRspackPlugin({
      filename: "standalone.html",
      chunks: ["devHarness"],
      templateContent: "<!DOCTYPE html><html><body></body></html>",
    }),
  ],
};
```

## 4. Run it standalone (1 min)

```
yarn install
yarn workspace @hostyara/notes dev
```

Open `http://localhost:5199/standalone.html`. Your app is mounted inside
a shadow root, exactly the shape the real host uses — open devtools and
inspect `document.querySelector('[data-app="notes"]').shadowRoot` to see
it. No host process needs to be running for this step.

## 5. Add the conformance test (2 min)

`src/__jest__/conformance.test.ts`:

```ts
import { runConformanceSuite } from "@hostyara/conformance";

runConformanceSuite({
  appId: "notes",
  loadAppModule: () => import("../index").then((m) => m.default),
});
```

```
yarn jest apps/notes
```

This is the same suite described in [app-module.md](./app-module.md) —
mount/unmount idempotency, no head pollution, no direct history access,
prefixed storage/custom-element names, reacting to location changes,
surviving a context switch. It should pass with zero setup beyond the
`AppModule` you already wrote, if you followed the pattern above.

Root `yarn typecheck` does **not** cover remote apps — only
`apps/host/src`. `yarn jest apps/notes` (via ts-jest) is what actually
type-checks your app's code today; run `yarn workspace @hostyara/notes
build` too to catch anything Rspack's `swc-loader` would hit that ts-jest
wouldn't (swc-loader doesn't type-check at all, it just strips types).

## 6. Register it with the real host (2 min)

Add an entry to `apps/host/src/registry/registry.json` — see
[manifest.md](./manifest.md) for the full field reference:

```json
{
  "id": "notes",
  "name": "Заметки",
  "version": "0.0.1",
  "contract": "1",
  "category": "Прочее",
  "tags": [],
  "surfaces": {},
  "permissions": [],
  "entities": [],
  "routes": ["/"],
  "mount": {
    "remoteEntry": "http://localhost:5199/remoteEntry.js",
    "exposed": "./app",
    "styles": []
  },
  "network": { "connect": [] }
}
```

Add `notes` to the root `dev` script's `concurrently` list if you want it
to start alongside the host and the other demo apps, or just run
`yarn workspace @hostyara/notes dev` in a separate terminal — the host
picks up any registered app from `registry.json` on load.

Start the host (`yarn workspace @hostyara/host dev`) and visit
`http://localhost:3000/h/<any-household>/a/notes`. If you'd rather test
against a `remoteEntry.js` you haven't registered yet, use the
`?_remote=notes@http://localhost:5199/remoteEntry.js` override instead of
editing the registry — see [manifest.md](./manifest.md).

## 7. Sanity checklist before you call it done

- [ ] `yarn workspace @hostyara/notes build` succeeds.
- [ ] `yarn jest apps/notes` passes (conformance + any tests of your own).
- [ ] The app renders correctly through `standalone.html` (dev-harness).
- [ ] The app renders correctly through the real host, and clicking
      around (browser Back/Forward, a deep link, a household switch if
      applicable) behaves as expected — this exercises real
      `sdk.router`/`sdk.context` wiring the dev-harness's fakes don't.
- [ ] Every domain your app's own code fetches (beyond `remoteEntry`'s and
      your styles' own origins) is listed in `network.connect` — otherwise
      the host's CSP will block it silently. See [manifest.md](./manifest.md).

From here, [shared-realm.md](./shared-realm.md) and
[routing.md](./routing.md) cover the isolation rules and URL scheme in
more depth than you need for a first app, but are worth reading before
building anything that does real navigation or persists data.
