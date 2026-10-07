import { createContext, ReactNode, useContext } from "react";
import { HostSDK } from "@hostyara/contracts";

const SdkContext = createContext<HostSDK | null>(null);

export function SdkProvider({ sdk, children }: { sdk: HostSDK; children: ReactNode }) {
  return <SdkContext.Provider value={sdk}>{children}</SdkContext.Provider>;
}

export function useSdk(): HostSDK {
  const sdk = useContext(SdkContext);
  if (!sdk) throw new Error("useSdk outside SdkProvider");
  return sdk;
}

// basename is `/h/:hid/a/:appId` (IA §4) — the id this app was mounted under
// ("recipes" via Module Federation, "recipes-iframe" via iframe), which is
// the only `service` sdk.api.request accepts.
export function ownAppId(sdk: HostSDK): string {
  return sdk.basename.split("/").filter(Boolean).at(-1) ?? "";
}
