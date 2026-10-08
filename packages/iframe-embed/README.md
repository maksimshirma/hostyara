# @hostyara/iframe-embed

The embed-side half of the iframe transport: `connectToHost` performs a
`postMessage` handshake with the host's iframe wrapper, receives a
`MessagePort`, and returns a real `HostSDK` proxy backed by
`@hostyara/event-bus`'s `MessagePort` channel — so an app mounted via
iframe uses the exact same `HostSDK` interface as one mounted via Module
Federation.

## Installation

Workspace-internal package:

```json
{
  "dependencies": {
    "@hostyara/iframe-embed": "workspace:^"
  }
}
```

then `yarn install` from the repo root.

## Usage

```ts
// src/iframe-entry.ts
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

`hostOrigin` must match exactly — `connectToHost` rejects any message not
from that origin. See [docs/remote-build.md](../../docs/remote-build.md)
at the repo root for how this entry point is wired into a remote's build.

## `api` and `access` across the boundary

- `sdk.api.request` goes to the host over the channel; the host's own
  `sdk.api` (pinned to this app and the open household) makes the BFF call.
  Errors come back as the same plain `SdkApiError` objects (the channel only
  carries strings for thrown errors, so results travel as
  `{ ok, value | error }` values); a broken channel rejects with
  `network_error`.
- `sdk.access.level` and `can()` are synchronous, so the proxy keeps a local
  snapshot: the one in the handshake ack, then every `access.changed` the
  host pushes (which also fires `sdk.access.subscribe` callbacks). A host that
  sends no snapshot grants nothing. `requestAccess` is forwarded to the host.
