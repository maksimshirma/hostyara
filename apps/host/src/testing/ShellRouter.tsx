import { ReactNode, useEffect, useState } from "react";
import { RouterContextProvider } from "@tanstack/react-router";
import { createHostHistory } from "../router";
import { createAppRouter } from "../router/appRouter";

// Router context for a component rendered on its own (unit tests,
// Storybook): TanStack Router over a host history, as SessionGate sets it
// up — without rendering the routes.
export function ShellRouter({ children }: { children: ReactNode }) {
  const [router] = useState(() => createAppRouter(createHostHistory()));
  // RouterProvider would do this itself; RouterContextProvider doesn't.
  useEffect(() => router.history.subscribe(() => void router.load()), [router]);
  return <RouterContextProvider router={router}>{children}</RouterContextProvider>;
}
