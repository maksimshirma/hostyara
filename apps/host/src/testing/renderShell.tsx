import { StrictMode } from "react";
import { render } from "@testing-library/react";
import { RouterProvider as TanStackRouterProvider } from "@tanstack/react-router";
import { User } from "@hostyara/contracts";
import { AccessTracker } from "../api/accessTracker";
import { BffClient } from "../api/bffClient";
import { attachRouteComponents } from "../app/routeComponents";
import { createHostHistory, Household } from "../router";
import { createAppRouter } from "../router/appRouter";
import { SessionProvider, SessionView } from "../session/SessionContext";

export interface SignedInShellProps {
  bff: BffClient;
  accessTracker: AccessTracker;
  user: User;
  households: Household[];
  onLogout: () => void;
}

// Renders the routed shell at the current window.location the way
// SessionGate does for a signed-in person, with the route already loaded
// so the first render is synchronous.
export async function renderShell(props: SignedInShellProps, opts: { strictMode?: boolean } = {}) {
  attachRouteComponents();
  const appRouter = createAppRouter(createHostHistory(), {
    session: { kind: "signed-in", households: props.households },
  });
  await appRouter.load();
  const view: SessionView = {
    state: { kind: "signed-in", user: props.user, households: props.households },
    bff: props.bff,
    accessTracker: props.accessTracker,
    login: async () => null,
    signUp: async () => null,
    logout: props.onLogout,
  };
  const ui = (
    <SessionProvider value={view}>
      <TanStackRouterProvider router={appRouter} />
    </SessionProvider>
  );
  return { ...render(opts.strictMode ? <StrictMode>{ui}</StrictMode> : ui), appRouter };
}
