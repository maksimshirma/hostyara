# Remote build requirements

A remote app is built with Rspack and `@module-federation/enhanced`. This
describes what a build config must do to produce a mountable remote — see
`apps/demo-recipes/rspack.config.mjs` for the reference implementation.

## Module Federation exposes

```js
import { ModuleFederationPlugin } from "@module-federation/enhanced/rspack";

new ModuleFederationPlugin({
  name: "recipes",
  filename: isProduction ? "remoteEntry.[contenthash].js" : "remoteEntry.js",
  exposes: {
    "./app": "./src/index.tsx",
  },
  dts: false,
});
```

`exposes["./app"]` must resolve to a module whose default export satisfies
`AppModule` (see [app-module.md](./app-module.md)). The manifest's
`mount.exposed` field (`"./app"` in this example) must match the key here
exactly. `dts: false` — this repo doesn't generate or consume Module
Federation's TypeScript type-sharing; contracts are shared via the
`@hostyara/contracts` package instead, which both host and remotes depend
on directly.

No `shared` option is configured on the remote side in this codebase.
Dependency deduplication between host and remotes isn't handled via MF's
`shared` field on the remote — the one place `shared` is used is on the
**host's** own MF runtime init (`apps/host/src/remote-loader/
createRemoteLoader.ts`), which marks `@hostyara/sdk` as a shared singleton.
Don't assume `shared` on your remote's own config does anything unless you
add it yourself.

## Output and content hashing

```js
output: {
  publicPath: "http://localhost:5174/",
  uniqueName: "recipes",
  filename: isProduction ? "[name].[contenthash].js" : "[name].js",
  cssFilename: isProduction ? "[name].[contenthash].css" : "[name].css",
},
```

`uniqueName` must be unique across every remote the host loads (it namespaces
Module Federation's internal module registry) — use your app's `id`.
Content hashes are only applied in production builds; dev builds use plain
names for faster rebuilds. The host doesn't need to know your hashed
filenames — Module Federation resolves them at runtime via its own
manifest (`mf-manifest.json`), and your manifest's `mount.remoteEntry`
points at the unhashed `remoteEntry.js` entry point either way.

## CSS: extraction and `:host`

Both demo apps use Rspack's built-in CSS handling rather than a separate
extraction plugin:

```js
module: {
  rules: [
    {
      test: /\.module\.css$/,
      type: "css/module",
      parser: { namedExports: false },
    },
  ],
},
experiments: { css: true },
```

Your top-level component's CSS module should open with a `:host` rule,
because the host mounts your app inside a shadow root and `:host` is what
targets that shadow root's own host element:

```css
/* App.module.css */
:host {
  display: block;
  font-family: var(--ui-font-family);
  color: var(--ui-color-text);
}
```

List every CSS file your build produces (Module Federation exposes CSS
under a `__federation_expose_app.css`-style name by convention) in your
manifest's `mount.styles` array — the host fetches each URL as text and
injects it as an inline `<style>` into your shadow root. It does **not**
crawl your JS bundle looking for stylesheets; if you forget to list one, it
silently won't apply.

There is no `styleRoot` field on the real `HostSDK` for apps that need an
explicit shadow-root reference (e.g. some CSS-in-JS libraries that portal
outside the React tree). If your styling approach needs one, you'll need to
propose adding it to the contract — don't assume `sdk.ui.styleRoot`
generalizes to the real host; that's a dev-harness-only stub today (see
[sdk-reference.md](./sdk-reference.md)).

As a safety net, not a mechanism to rely on: the host's mount manager
watches `document.head` during your `mount()` call and relocates any stray
`<style>`/`<link rel="stylesheet">` your bundler's runtime injects there
into your shadow root instead. Don't depend on this — extract your CSS
properly; the conformance suite's `document.head`-unchanged check will fail
if you don't, regardless of the relocation safety net.

## The three entry points

A fully-wired remote has three separate bootstrap files sharing the same
`AppModule`, one per transport:

| Entry                              | Loads via                              | Purpose                                                                    |
| ---------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| `src/index.tsx` (your `AppModule`) | —                                      | The actual app; exposed by `exposes["./app"]`.                             |
| `src/dev-harness-entry.ts`         | `standalone.html`, your own dev server | Run your app with no host at all — see [quickstart.md](./quickstart.md).   |
| `src/iframe-entry.ts`              | `iframe.html`                          | Run inside the host via the iframe transport instead of Module Federation. |

The dev-harness entry:

```ts
import { runDevHarness } from "@hostyara/dev-harness";
import appModule from "./index";

void runDevHarness(appModule, { appId: "recipes" });
```

The iframe entry:

```ts
import { connectToHost } from "@hostyara/iframe-embed";
import appModule from "./index";

async function boot(): Promise<void> {
  const root = document.getElementById("root");
  if (!root) throw new Error("iframe-entry: #root not found");
  const sdk = await connectToHost({ contract: "1", hostOrigin: "http://localhost:3000" });
  await appModule.mount(root, sdk);
}
void boot();
```

Both are wired up as separate Rspack `entry` keys with an
`HtmlRspackPlugin` producing the corresponding HTML file — see
`apps/demo-recipes/rspack.config.mjs` for the exact plugin config.

`apps/demo-budget` currently only implements the Module Federation entry —
it has no `dev-harness-entry.ts`, no `iframe-entry.ts`, and its Rspack
`entry` is empty. It cannot be run standalone or via iframe today. Use
`demo-recipes` as the reference for a remote that supports all three
transports; don't assume `demo-budget` demonstrates the same pattern.
