import { createRouter, RouterHistory } from "@tanstack/react-router";
import { HostRouterContext, routeTree } from "./routes";
import { parseSearchVerbatim, stringifySearchVerbatim } from "./searchVerbatim";

export function createAppRouter(
  history: RouterHistory,
  context: HostRouterContext = { session: { kind: "pending" } },
) {
  return createRouter({
    routeTree,
    history,
    context,
    // Per history entry (the key the host history writes into state), so
    // Back to the same address twice in the stack restores each one's own
    // position — including across app switches.
    scrollRestoration: true,
    getScrollRestorationKey: (location) => location.state.__TSR_key ?? location.href,
    parseSearch: parseSearchVerbatim,
    stringifySearch: stringifySearchVerbatim,
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}
