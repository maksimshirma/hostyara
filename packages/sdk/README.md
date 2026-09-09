# @hostyara/sdk

A type-only re-export barrel for the `HostSDK`-related types in
`@hostyara/contracts` (`HostSDK`, `HostChannel`, `SdkContext`, `SdkRouter`,
`SdkNav`, `SdkApps`, `SdkShare`, `Publication`, `Location`, `Crumb`). It
exists so app code can `import from "@hostyara/sdk"` without depending on
the full, broader `@hostyara/contracts` surface — the types are identical
either way.

## Installation

Workspace-internal package:

```json
{
  "dependencies": {
    "@hostyara/sdk": "workspace:^"
  }
}
```

then `yarn install` from the repo root.

## Usage

```ts
import { HostSDK, SdkRouter } from "@hostyara/sdk";

function useAppRoute(sdk: HostSDK): SdkRouter["location"] {
  return sdk.router.location;
}
```

See [docs/sdk-reference.md](../../docs/sdk-reference.md) at the repo root
for the full `HostSDK` field reference.
