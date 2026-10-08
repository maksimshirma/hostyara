import { createContext, ReactNode, useContext } from "react";
import { User } from "@hostyara/contracts";
import { AccessTracker } from "../api/accessTracker";
import { BffClient } from "../api/bffClient";
import { Household } from "../router";
import { AuthFailure } from "./sessionApi";

export type SessionState =
  | { kind: "checking" }
  // logout — явный выход; expired — сессию потеряли посреди работы;
  // initial — сессии не было с самого начала.
  | { kind: "signed-out"; reason: "initial" | "expired" | "logout" }
  | { kind: "two-factor" }
  | { kind: "signed-in"; user: User; households: Household[] }
  | { kind: "unavailable" };

// What route components need from SessionGate: the session and the
// actions that change it.
export interface SessionView {
  state: SessionState;
  bff: BffClient;
  accessTracker: AccessTracker;
  login(email: string, password: string): Promise<AuthFailure | null>;
  signUp(name: string, email: string, password: string): Promise<AuthFailure | null>;
  logout(): void;
}

const SessionContext = createContext<SessionView | null>(null);

export function SessionProvider({ value, children }: { value: SessionView; children: ReactNode }) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionView {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionGate");
  return session;
}

// Session steps that have no address of their own (checking, 2FA, first
// household, service unavailable) are drawn by the root route in place of
// the matched page; OUTLET means "draw the page".
export const OUTLET = Symbol("outlet");
export type GateScreen = ReactNode | typeof OUTLET;

const GateScreenContext = createContext<GateScreen>(OUTLET);
export const GateScreenProvider = GateScreenContext.Provider;

export function useGateScreen(): GateScreen {
  return useContext(GateScreenContext);
}
