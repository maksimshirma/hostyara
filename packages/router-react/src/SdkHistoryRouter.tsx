import { PropsWithChildren, useState } from "react";
import { HostSDK } from "@hostyara/contracts";
import { unstable_HistoryRouter as HistoryRouter } from "react-router-dom";
import { createReactRouterHistory } from "./createReactRouterHistory";

export interface SdkHistoryRouterProps {
  sdk: HostSDK;
}

// Lets an author write ordinary <Route>/<Link> React Router code without
// ever touching window.history — the memory-router-like history object
// underneath is actually sdk.router.
export function SdkHistoryRouter({ sdk, children }: PropsWithChildren<SdkHistoryRouterProps>) {
  const [history] = useState(() => createReactRouterHistory(sdk));

  return <HistoryRouter history={history}>{children}</HistoryRouter>;
}
