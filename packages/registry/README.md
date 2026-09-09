# @hostyara/registry

`AppRegistry` — an in-memory store of `AppManifest` entries, keyed by app
id. Used by the host to register every app from `registry.json` at
startup and resolve an app id to its manifest, rejecting apps whose
`contract` major version the host doesn't support.

## Installation

Workspace-internal package:

```json
{
  "dependencies": {
    "@hostyara/registry": "workspace:^"
  }
}
```

then `yarn install` from the repo root.

## Usage

```ts
import { AppRegistry } from "@hostyara/registry";
import manifests from "./registry.json";

const registry = new AppRegistry();
for (const manifest of manifests) registry.register(manifest);

const result = registry.resolve("recipes");
if (result.ok) {
  console.log(result.manifest.mount.remoteEntry);
} else {
  // result.error.kind: "unknown-app" | "incompatible-contract"
  console.error(result.error);
}
```

See [docs/manifest.md](../../docs/manifest.md) at the repo root for the
full `AppManifest` format and contract-versioning rules.
