import { ReactNode, useEffect, useState } from "react";
import { createHostRouter, createHouseholdLookup, Household, RouterProvider } from "../router";
import { DEMO_HOUSEHOLDS } from "./fixtures";

// Stands in for SessionGate's router for components rendered on their own:
// a host router over a fixed household list, attached like the real one.
export function ShellRouter({
  children,
  households = DEMO_HOUSEHOLDS,
}: {
  children: ReactNode;
  households?: Household[];
}) {
  const [router] = useState(() => createHostRouter(createHouseholdLookup(households)));
  useEffect(() => router.attach(), [router]);
  return <RouterProvider router={router}>{children}</RouterProvider>;
}
