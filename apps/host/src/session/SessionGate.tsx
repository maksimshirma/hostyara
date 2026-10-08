import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { User } from "@hostyara/contracts";
import { AccessEventSource, createAccessTracker } from "../api/accessTracker";
import { createBffClient } from "../api/bffClient";
import { HostChrome } from "../chrome/HostChrome";
import {
  createHostRouter,
  createHouseholdLookup,
  FROM_PARAM,
  Household,
  parseRoute,
  paths,
  RouterProvider,
  useRouterLocation,
} from "../router";
import { decideRouteRedirect, RedirectSession } from "./decideRouteRedirect";
import { AuthFailure, createSessionApi, LoginOutcome } from "./sessionApi";
import { SignInPage } from "../pages/auth/SignInPage";
import {
  CreateHouseholdPage,
  TwoFactorPage,
  UnavailablePage,
} from "../pages/auth/SessionStepPages";
import { SignUpPage } from "../pages/auth/SignUpPage";
import { PublicLayout } from "../pages/PublicLayout";
import { ShellPage } from "../pages/ShellPage";
import { pageChrome } from "../pages/shellPages";

type SessionState =
  | { kind: "checking" }
  // logout — явный выход; expired — сессию потеряли посреди работы;
  // initial — сессии не было с самого начала.
  | { kind: "signed-out"; reason: "initial" | "expired" | "logout" }
  | { kind: "two-factor" }
  | { kind: "signed-in"; user: User; households: Household[] }
  | { kind: "unavailable" };

const SESSION_ENDED_NOTICE = "Сессия завершена — войдите снова";

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
  const householdsRef = useRef<Household[]>([]);
  const [router] = useState(() =>
    createHostRouter({
      resolve: (hid) => createHouseholdLookup(householdsRef.current).resolve(hid),
    }),
  );
  const location = useRouterLocation(router);
  const route = useMemo(() => parseRoute(location.pathname), [location.pathname]);
  const redirect = decideRouteRedirect(route, location, toRedirectSession(state));
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

  useEffect(() => router.attach(), [router]);

  const households = state.kind === "signed-in" ? state.households : null;
  useEffect(() => {
    householdsRef.current = households ?? [];
    router.canonicalize();
  }, [households, router]);

  useEffect(() => {
    if (redirect) router.navigate(redirect, { replace: true });
  }, [redirect, router]);

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

  // Вход и регистрация передают друг другу исходный адрес.
  const returnAddress = new URLSearchParams(location.search).get(FROM_PARAM) ?? undefined;

  return <RouterProvider router={router}>{redirect ? null : renderScreen()}</RouterProvider>;

  function renderScreen() {
    switch (state.kind) {
      case "checking":
        return null;
      case "unavailable":
        return <UnavailablePage onRetry={() => void restore()} />;
      case "signed-out":
        if (route.kind === "login") {
          return (
            <SignInPage
              notice={state.reason === "expired" ? SESSION_ENDED_NOTICE : null}
              signUpHref={paths.signup({ from: returnAddress })}
              onLogin={async (email, password) => complete(await sessionApi.login(email, password))}
            />
          );
        }
        if (route.kind === "signup") {
          return (
            <SignUpPage
              signInHref={paths.login({ from: returnAddress })}
              onSignUp={async (name, email, password) =>
                complete(await sessionApi.signUp(name, email, password))
              }
            />
          );
        }
        return renderStandalonePage(true);
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
      case "signed-in":
        if (pageChrome(route, location.pathname) === "standalone") {
          return renderStandalonePage(false);
        }
        if (state.households.length === 0) {
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
        return (
          <HostChrome
            bff={bff}
            accessTracker={accessTracker}
            user={state.user}
            households={state.households}
            onLogout={() => void logout()}
          />
        );
    }
  }

  // Публичные страницы и 404 вне пространства — без меню shell.
  function renderStandalonePage(signedOut: boolean) {
    return (
      <PublicLayout showSignUp={signedOut && route.kind !== "not-found"}>
        <ShellPage route={route} />
      </PublicLayout>
    );
  }
}
