import { useMemo, useSyncExternalStore } from "react";
import { RouterHistory } from "@tanstack/react-router";

export interface HistoryAddress {
  pathname: string;
  search: string;
  hash: string;
}

// The history's current address, for code above TanStack's RouterProvider
// (SessionGate): it changes synchronously with every write, before TanStack
// has loaded the new matches. The snapshot is the href string — location
// objects are fresh on every change.
export function useHistoryLocation(history: RouterHistory): HistoryAddress {
  const href = useSyncExternalStore(history.subscribe, () => history.location.href);
  return useMemo(() => {
    const url = new URL(href, "http://host.invalid");
    return { pathname: url.pathname, search: url.search, hash: url.hash };
  }, [href]);
}
