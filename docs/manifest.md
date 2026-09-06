# Manifest format

Every app installed in the host is described by an `AppManifest` entry in
`apps/host/src/registry/registry.json`. The registry is the single source
of truth the host reads at startup — there's no separate "install" step.

## Shape

`packages/contracts/src/manifest.ts`:

```ts
export interface AppManifest {
  id: string;
  name: string;
  version: string;
  contract: string;
  category: string;
  tags: string[];
  surfaces: AppSurfaces;
  permissions: Permission[];
  entities: EntityRoute[];
  share?: ShareDescriptor;
  routes: string[];
  mount: AppMount;
  network: AppNetwork;
}

interface AppMount {
  type?: "module-federation" | "iframe"; // defaults to Module Federation
  remoteEntry: string;
  exposed: string;
  styles: string[];
}

interface AppNetwork {
  connect: string[]; // origins/domains this app is allowed to reach
}

interface AppSurfaces {
  homeWidgets?: string[];
  quickActions?: string[];
  search?: boolean;
  notifications?: boolean;
}

interface EntityRoute {
  type: string;
  route: string;
}

type Permission = string;

interface ShareDescriptor {
  entities: string[];
  route: string;
}
```

`category` and `tags` are plain strings — there's no enum or validation on
their values today.

## A real example

From `apps/host/src/registry/registry.json`:

```json
{
  "id": "recipes",
  "name": "Рецепты",
  "version": "0.1.0",
  "contract": "1",
  "category": "Кухня",
  "tags": ["еда", "планирование"],
  "surfaces": { "search": true },
  "permissions": [],
  "entities": [{ "type": "recipe", "route": "/r/:id/:slug" }],
  "routes": ["/", "/r/:id/*"],
  "mount": {
    "remoteEntry": "http://localhost:5174/remoteEntry.js",
    "exposed": "./app",
    "styles": ["http://localhost:5174/__federation_expose_app.css"]
  },
  "network": { "connect": [] }
}
```

The same app can also be registered a second time under a different `id`
with `mount.type: "iframe"` pointing at a static HTML page instead of a
`remoteEntry.js` — see `recipes-iframe` in the same file — if it needs the
stronger isolation an iframe gives you. Module Federation is the default
and should be preferred; use iframe only for isolation, legacy, or
untrusted-code scenarios (see [shared-realm.md](./shared-realm.md)).

## `network.connect` and CSP

`network.connect` isn't just documentation — `apps/host/src/csp/
buildContentSecurityPolicy.ts` unions every installed app's `network.connect`
into the shell's `connect-src` CSP directive. An app that fetches a domain
it didn't declare here will be blocked by the browser, not just flagged in
review. `mount.remoteEntry`'s origin and every `mount.styles` origin are
added automatically — only _additional_ domains your app's own code
`fetch`es need to be listed.

## Contract versioning

`contract` is checked by major-version prefix only
(`packages/registry/src/contract-version.ts`,
`SUPPORTED_CONTRACT_MAJOR = "1"`). `AppRegistry.resolve(appId)` returns:

```ts
type ResolveResult = { ok: true; manifest: AppManifest } | { ok: false; error: ResolveError };

type ResolveError =
  | { kind: "unknown-app"; appId: string }
  | { kind: "incompatible-contract"; appId: string; expectedMajor: string; actualMajor: string };
```

An app declaring `"contract": "2.0"` when the host only supports major `1`
fails resolution with `incompatible-contract` rather than being mounted
against a contract it doesn't implement.

## Overriding a remote for local development

`?_remote=<appId>@<remoteEntryUrl>` on the host's own URL swaps one app's
`mount.remoteEntry` at load time, without editing `registry.json`:

```
http://localhost:3000/h/demo-semya-ivanovyh?_remote=recipes@http://localhost:5174/remoteEntry.js
```

Repeatable — add more than one `_remote` param to override several apps at
once. Only `mount.remoteEntry` is rewritten; `exposed`, `styles`, and `type`
come from the registry entry unchanged. This is how you point the live host
at your own app while it's still under development — see
[quickstart.md](./quickstart.md).
