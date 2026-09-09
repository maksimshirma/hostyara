# @hostyara/event-bus

Two implementations of `HostChannel` (`@hostyara/contracts`'s
`request`/`on` RPC interface) used to talk between the host and a mounted
app: `createHostChannel()` for the common case where both sides share one
JS realm (Module Federation), and `createMessagePortChannel(port)` for
when they don't (the iframe transport, where each side gets its own
`MessagePort` from a shared `MessageChannel`).

## Installation

Workspace-internal package:

```json
{
  "dependencies": {
    "@hostyara/event-bus": "workspace:^"
  }
}
```

then `yarn install` from the repo root.

## Usage

```ts
import { createHostChannel } from "@hostyara/event-bus";

const channel = createHostChannel();

const unsubscribe = channel.on("ping", () => "pong");
await channel.request("ping"); // "pong"
unsubscribe();
```

Cross-realm, via a `MessagePort`:

```ts
import { createMessagePortChannel } from "@hostyara/event-bus";

const { port1, port2 } = new MessageChannel();
const hostSide = createMessagePortChannel(port1);
const appSide = createMessagePortChannel(port2);
```

`@hostyara/iframe-embed`'s `connectToHost` uses `createMessagePortChannel`
internally — see that package for the full iframe handshake.
