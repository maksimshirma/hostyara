# @hostyara/dev-harness

Runs a remote's `AppModule` standalone, with no host process running at
all: creates the same DOM shape the real host's mount manager uses (an
open shadow root inside a `div[data-app]`) and a fake `HostSDK` whose
router drives the page's own `window.history` directly — something an app
is never allowed to do once actually hosted, but is the only option here
since there's no host to own it instead.

## Installation

Workspace-internal package:

```json
{
  "dependencies": {
    "@hostyara/dev-harness": "workspace:^"
  }
}
```

then `yarn install` from the repo root.

## Usage

```ts
// src/dev-harness-entry.ts
import { runDevHarness } from "@hostyara/dev-harness";
import appModule from "./index";

void runDevHarness(appModule, { appId: "recipes" });
```

Wire this file up as a separate Rspack entry producing a `standalone.html`
page, then run your app's own `dev` script and open that page — no other
part of the platform needs to be running. See
[docs/quickstart.md](../../docs/quickstart.md) at the repo root for the
full setup, including the Rspack config.
