import { useCallback, useEffect, useMemo, useState } from "react";
import { RouterProvider as TanStackRouterProvider } from "@tanstack/react-router";
import { User } from "@hostyara/contracts";
import { AccessEventSource, createAccessTracker } from "../api/accessTracker";
import { createBffClient } from "../api/bffClient";
import { attachRouteComponents } from "../app/routeComponents";
import {
  CreateHouseholdPage,
  TwoFactorPage,
  UnavailablePage,
} from "../pages/auth/SessionStepPages";
import { createHostHistory, routeForPath, useHistoryLocation } from "../router";
import { createAppRouter } from "../router/appRouter";
import { decideRouteRedirect, RedirectSession } from "../router/redirectRules";
import {
  GateScreen,
  GateScreenProvider,
  OUTLET,
  SessionProvider,
  SessionState,
  SessionView,
} from "./SessionContext";
import { AuthFailure, createSessionApi, LoginOutcome } from "./sessionApi";

export interface SessionGateProps {
  // Test seams; default to the browser's own.
  fetch?: typeof fetch;
  createEventSource?: (url: string) => AccessEventSource;
}

function toRedirectSession(state: SessionState): RedirectSession {
  switch (state.kind) {
    case "signed-out":
      return { kind: "signed-out", keepReturnAddress: state.reason !== "logout" };
    case "signed-in":
      return { kind: "signed-in", households: state.households };
    default:
      return { kind: "pending" };
  }
}

// The host owns the session and top-level routing (CLAUDE.md, «Architectural
// Boundaries»): nothing below this component renders until /auth/me confirms
// a session. Without one, any non-public address is sent to /login with the
// original address in `_from`; signing in returns there. Any BFF answer of
// `unauthenticated` — from the shell or from an app's sdk.api — and the SSE
// stream's `session.ended` do the same.
export function SessionGate({ fetch, createEventSource }: SessionGateProps) {
  const [state, setState] = useState<SessionState>({ kind: "checking" });
  const [history] = useState(() => createHostHistory());
  const [appRouter] = useState(() => {
    attachRouteComponents();
    return createAppRouter(history);
  });
  const location = useHistoryLocation(history);
  const route = useMemo(() => routeForPath(location.pathname), [location.pathname]);
  const session = useMemo(() => toRedirectSession(state), [state]);
  const routerContext = useMemo(() => ({ session }), [session]);
  // TanStack performs the redirect (root beforeLoad); until it lands, don't
  // render the screen the person is about to be taken away from.
  const redirect = decideRouteRedirect(route, location, session);
  const signOutLocally = useCallback(
    () =>
      setState((current) =>
        current.kind === "signed-in" ? { kind: "signed-out", reason: "expired" } : current,
      ),
    [],
  );
  const [bff] = useState(() => createBffClient({ onUnauthenticated: signOutLocally, fetch }));
  const [accessTracker] = useState(() =>
    createAccessTracker({ bff, onSessionEnded: signOutLocally, createEventSource }),
  );
  const [sessionApi] = useState(() => createSessionApi(bff));

  useEffect(() => () => accessTracker.close(), [accessTracker]);

  // Re-runs the route guards with the new session (sign-in, sign-out,
  // households loaded or created).
  useEffect(() => {
    void appRouter.invalidate();
  }, [appRouter, session]);

  const enter = useCallback(
    async (user: User) => {
      try {
        setState({ kind: "signed-in", user, households: await sessionApi.listHouseholds() });
      } catch {
        setState({ kind: "unavailable" });
      }
    },
    [sessionApi],
  );

  const restore = useCallback(async () => {
    setState({ kind: "checking" });
    try {
      const user = await sessionApi.fetchCurrentUser();
      if (user) await enter(user);
      else setState({ kind: "signed-out", reason: "initial" });
    } catch {
      setState({ kind: "unavailable" });
    }
  }, [enter, sessionApi]);

  useEffect(() => {
    void restore();
  }, [restore]);

  async function complete(outcome: LoginOutcome): Promise<AuthFailure | null> {
    if (outcome.kind === "failed") return outcome.reason;
    if (outcome.kind === "two-factor") setState({ kind: "two-factor" });
    else await enter(outcome.user);
    return null;
  }

  async function logout() {
    try {
      await sessionApi.logout();
    } finally {
      setState({ kind: "signed-out", reason: "logout" });
    }
  }

  const view: SessionView = {
    state,
    bff,
    accessTracker,
    login: async (email, password) => complete(await sessionApi.login(email, password)),
    signUp: async (name, email, password) =>
      complete(await sessionApi.signUp(name, email, password)),
    logout: () => void logout(),
  };

  return (
    <SessionProvider value={view}>
      <GateScreenProvider value={redirect ? null : gateScreen()}>
        <TanStackRouterProvider router={appRouter} context={routerContext} />
      </GateScreenProvider>
    </SessionProvider>
  );

  // Session steps without an address of their own; OUTLET lets the matched
  // route draw the page.
  function gateScreen(): GateScreen {
    switch (state.kind) {
      case "checking":
        return null;
      case "unavailable":
        return <UnavailablePage onRetry={() => void restore()} />;
      case "two-factor":
        return (
          <TwoFactorPage
            onVerify={async (code) => {
              const outcome = await sessionApi.verifyTwoFactor(code);
              if (outcome.kind === "failed" && outcome.reason === "expired") {
                setState({ kind: "signed-out", reason: "initial" });
              }
              return complete(outcome);
            }}
            onCancel={() => setState({ kind: "signed-out", reason: "initial" })}
          />
        );
      case "signed-in": {
        // An invitation or a shared link opens even before the first household.
        const isPublicPage = route.kind === "invite" || route.kind === "share";
        if (state.households.length > 0 || isPublicPage) return OUTLET;
        return (
          <CreateHouseholdPage
            onCreate={async (name) => {
              try {
                const household = await sessionApi.createHousehold(name);
                setState({ ...state, households: [household] });
                return null;
              } catch {
                return "unavailable";
              }
            }}
          />
        );
      }
      case "signed-out":
        return OUTLET;
    }
  }
}
