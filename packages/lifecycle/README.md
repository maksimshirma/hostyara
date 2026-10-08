# @hostyara/lifecycle

A one-function helper for defining an `AppModule` (`@hostyara/contracts`)
without writing out both `mount` and `unmount` when one of them is a
no-op — for apps that only need to react to one side of the lifecycle, or
for tests.

## Installation

Workspace-internal package:

```json
{
  "dependencies": {
    "@hostyara/lifecycle": "workspace:^"
  }
}
```

then `yarn install` from the repo root.

## Usage

```ts
import { createLifecycle } from "@hostyara/lifecycle";

export default createLifecycle({
  mount(el, sdk) {
    el.textContent = sdk.router.location.pathname;
  },
  // unmount omitted — defaults to a no-op
});
```

See [docs/app-module.md](../../docs/app-module.md) at the repo root for
the full `AppModule` contract this wraps.
