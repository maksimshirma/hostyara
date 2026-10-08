# @hostyara/router-react

Adapts `sdk.router` (`@hostyara/contracts`'s `SdkRouter`) into a React
Router `history` object, so an app can write ordinary `<Route>`/`<Link>`
React Router code without ever touching `window.history` directly —
`sdk.router` stays the actual source of truth underneath.

## Installation

Workspace-internal package:

```json
{
  "dependencies": {
    "@hostyara/router-react": "workspace:^",
    "react-router-dom": "^7"
  }
}
```

then `yarn install` from the repo root.

## Usage

```tsx
import { SdkHistoryRouter } from "@hostyara/router-react";
import { Route, Routes } from "react-router-dom";
import { HostSDK } from "@hostyara/contracts";

function App({ sdk }: { sdk: HostSDK }) {
  return (
    <SdkHistoryRouter sdk={sdk}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/r/:id" element={<RecipeDetail />} />
      </Routes>
    </SdkHistoryRouter>
  );
}
```

Use `createReactRouterHistory(sdk)` directly if you need the raw `history`
object instead of the `<SdkHistoryRouter>` wrapper. See
[docs/routing.md](../../docs/routing.md) at the repo root for how
`sdk.router` itself works.
