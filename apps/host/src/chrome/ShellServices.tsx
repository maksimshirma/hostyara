import { createContext, ReactNode, useContext } from "react";
import { User } from "@hostyara/contracts";
import { AppRegistry } from "@hostyara/registry";
import { AccessTracker } from "../api/accessTracker";
import { BffClient } from "../api/bffClient";
import { MountManager } from "../mount-manager";
import { Observability } from "../observability";
import { RemoteLoader } from "../remote-loader";
import { AppNavStore } from "./appNavStore";

// What the shell layout (HostChrome) shares with the app slot (AppSlot):
// one registry, loader, mount manager and observability per signed-in
// session, plus the app the slot is currently trying to open — the global
// error handlers attribute uncaught errors to it.
export interface ShellServices {
  bff: BffClient;
  accessTracker: AccessTracker;
  user: User;
  registry: AppRegistry;
  remoteLoader: RemoteLoader;
  mountManager: MountManager;
  observability: Observability;
  appNav: AppNavStore;
  attempt: { appId: string | null; version: string | null };
}

const ShellServicesContext = createContext<ShellServices | null>(null);

export function ShellServicesProvider({
  services,
  children,
}: {
  services: ShellServices;
  children: ReactNode;
}) {
  return <ShellServicesContext.Provider value={services}>{children}</ShellServicesContext.Provider>;
}

export function useShellServices(): ShellServices {
  const services = useContext(ShellServicesContext);
  if (!services) throw new Error("useShellServices must be used inside HostChrome");
  return services;
}

export function appNameOf(registry: AppRegistry, appId: string): string {
  const resolved = registry.resolve(appId);
  return resolved.ok ? resolved.manifest.name : appId;
}
