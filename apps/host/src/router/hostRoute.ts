import { useMemo } from "react";
import { createMemoryHistory, createRouter, useRouterState } from "@tanstack/react-router";
import { routeTree } from "./routes";
import { Route } from "./route";

// Matching against the route tree is pure: a router over a throwaway
// memory history serves as the matcher, so the host's Route can be derived
// synchronously anywhere — in pure functions, tests and the SDK — not only
// inside React after TanStack has loaded the matches.
// Created on first use: routes.ts itself calls routeForPath from its
// beforeLoad, so the tree must be fully defined before the matcher is built.
let matcher: ReturnType<typeof createMatcher> | undefined;

function createMatcher() {
  return createRouter({
    routeTree,
    history: createMemoryHistory(),
    context: { session: { kind: "pending" } },
  });
}

const NOT_FOUND: Route = { kind: "not-found" };

// TanStack matches fuzzily (the deepest route the path starts with) and
// puts the unmatched rest under "**" — for the host that is a 404.
const UNMATCHED_REST = "**";

export function routeForPath(pathname: string): Route {
  matcher ??= createMatcher();
  const [, params, leaf] = matcher.getMatchedRoutes(pathname);
  if (params[UNMATCHED_REST] !== undefined) return NOT_FOUND;
  return leaf?.options.staticData?.toHostRoute?.(params) ?? NOT_FOUND;
}

// The host's view of the address TanStack Router has rendered — inside any
// route component.
export function useRoute(): Route {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return useMemo(() => routeForPath(pathname), [pathname]);
}
