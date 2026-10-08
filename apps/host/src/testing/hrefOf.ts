import { createMemoryHistory, LinkOptions } from "@tanstack/react-router";
import { createAppRouter } from "../router/appRouter";

const router = createAppRouter(createMemoryHistory());

// The address a typed link resolves to — what its <a href> will carry.
export function hrefOf(link: LinkOptions | string | undefined): string | undefined {
  if (link === undefined || typeof link === "string") return link;
  return router.buildLocation(link as Parameters<typeof router.buildLocation>[0]).href;
}
