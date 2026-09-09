# @hostyara/contracts

Canonical TypeScript types shared between the host and every microfrontend:
`AppModule` (the mount/unmount contract), `HostSDK` and its component
types, `AppManifest`, `HostChannel`, and the iframe handshake message
types. Every other package in this monorepo either depends on this one or
re-exports from it — it's the single source of truth for what a "contract"
means on this platform.

## Installation

Workspace-internal package, resolved automatically by Yarn workspaces —
add it as a dependency in another package's `package.json`:

```json
{
  "dependencies": {
    "@hostyara/contracts": "workspace:^"
  }
}
```

then `yarn install` from the repo root.

## Usage

```ts
import { AppModule, HostSDK } from "@hostyara/contracts";

const appModule: AppModule = {
  mount(el: HTMLElement, sdk: HostSDK) {
    el.textContent = sdk.router.location.pathname;
  },
  unmount(el: HTMLElement) {
    el.textContent = "";
  },
};

export default appModule;
```

See [docs/app-module.md](../../docs/app-module.md),
[docs/sdk-reference.md](../../docs/sdk-reference.md), and
[docs/manifest.md](../../docs/manifest.md) at the repo root for the full
reference on the types this package exports.
