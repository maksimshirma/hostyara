# @hostyara/conformance

A framework-agnostic Jest test suite that verifies an `AppModule`
(`@hostyara/contracts`) follows the platform's isolation rules: idempotent
mount/unmount, no `document.head` pollution, no direct
`window.history`/`window.location` access, prefixed storage keys and
custom element names, reacting to an externally-driven location change,
and surviving a household-context switch without unmounting. Every app
runs this from its own Jest test — see
[docs/app-module.md](../../docs/app-module.md) at the repo root for what
each check actually asserts.

## Installation

Workspace-internal package, added as a `devDependency`:

```json
{
  "devDependencies": {
    "@hostyara/conformance": "workspace:^"
  }
}
```

then `yarn install` from the repo root.

## Usage

```ts
// src/__jest__/conformance.test.ts
import { runConformanceSuite } from "@hostyara/conformance";

runConformanceSuite({
  appId: "recipes",
  loadAppModule: () => import("../index").then((m) => m.default),
  // Optional: assert your UI actually reacted to a host-driven location push
  expectReactedToLocationChange: (el) => {
    expect(el.textContent).not.toContain("Рецепты");
  },
});
```

```bash
yarn jest apps/demo-recipes/src/__jest__/conformance.test.ts
```
