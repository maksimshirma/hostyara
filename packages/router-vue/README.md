# @hostyara/router-vue

Adapts `sdk.router` (`@hostyara/contracts`'s `SdkRouter`) into a Vue
Router `RouterHistory`, so an app can use `vue-router` normally without
ever touching `window.history` directly — `sdk.router` stays the actual
source of truth underneath.

## Installation

Workspace-internal package:

```json
{
  "dependencies": {
    "@hostyara/router-vue": "workspace:^",
    "vue-router": "^4"
  }
}
```

then `yarn install` from the repo root.

## Usage

```ts
import { createVueRouterHistory } from "@hostyara/router-vue";
import { createRouter } from "vue-router";
import { HostSDK } from "@hostyara/contracts";

function createAppRouter(sdk: HostSDK) {
  return createRouter({
    history: createVueRouterHistory(sdk),
    routes: [
      { path: "/", component: OverviewScreen },
      { path: "/tx/:id", component: TransactionScreen },
    ],
  });
}
```

See [docs/routing.md](../../docs/routing.md) at the repo root for how
`sdk.router` itself works.
