import { useCallback, useEffect, useState } from "react";
import { User } from "@hostyara/contracts";
import { AccessEventSource, createAccessTracker } from "../api/accessTracker";
import { createBffClient } from "../api/bffClient";
import { HostChrome } from "../chrome/HostChrome";
import { Household } from "../router";
import { AuthFailure, createSessionApi, LoginOutcome } from "./sessionApi";
import {
  CreateHouseholdScreen,
  CredentialsScreen,
  TwoFactorScreen,
  UnavailableScreen,
} from "./SessionScreens";

type SessionState =
  | { kind: "checking" }
  | { kind: "signed-out"; notice: string | null }
  | { kind: "two-factor" }
  | { kind: "signed-in"; user: User; households: Household[] }
  | { kind: "unavailable" };

const SESSION_ENDED_NOTICE = "Сессия завершена — войдите снова";

export interface SessionGateProps {
  // Test seams; default to the browser's own.
  fetch?: typeof fetch;
  createEventSource?: (url: string) => AccessEventSource;
}

// The host owns the session (CLAUDE.md, «Architectural Boundaries»): nothing
// below this component renders until /auth/me confirms one. Any BFF answer
// of `unauthenticated` — from the shell or from an app's sdk.api — and the
// SSE stream's `session.ended` bring the login screen back; the URL is kept,
// so signing in again returns to the same place.
export function SessionGate({ fetch, createEventSource }: SessionGateProps) {
  const [state, setState] = useState<SessionState>({ kind: "checking" });
  const signOutLocally = useCallback(
    () =>
      setState((current) =>
        current.kind === "signed-in"
          ? { kind: "signed-out", notice: SESSION_ENDED_NOTICE }
          : current,
      ),
    [],
  );
  const [bff] = useState(() => createBffClient({ onUnauthenticated: signOutLocally, fetch }));
  const [accessTracker] = useState(() =>
    createAccessTracker({ bff, onSessionEnded: signOutLocally, createEventSource }),
  );
  const [sessionApi] = useState(() => createSessionApi(bff));

  useEffect(() => () => accessTracker.close(), [accessTracker]);

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
      else setState({ kind: "signed-out", notice: null });
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
      setState({ kind: "signed-out", notice: null });
    }
  }

  switch (state.kind) {
    case "checking":
      return null;
    case "unavailable":
      return <UnavailableScreen onRetry={() => void restore()} />;
    case "signed-out":
      return (
        <CredentialsScreen
          notice={state.notice}
          onLogin={async (email, password) => complete(await sessionApi.login(email, password))}
          onSignUp={async (name, email, password) =>
            complete(await sessionApi.signUp(name, email, password))
          }
        />
      );
    case "two-factor":
      return (
        <TwoFactorScreen
          onVerify={async (code) => {
            const outcome = await sessionApi.verifyTwoFactor(code);
            if (outcome.kind === "failed" && outcome.reason === "expired") {
              setState({ kind: "signed-out", notice: null });
            }
            return complete(outcome);
          }}
          onCancel={() => setState({ kind: "signed-out", notice: null })}
        />
      );
    case "signed-in":
      if (state.households.length === 0) {
        return (
          <CreateHouseholdScreen
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
