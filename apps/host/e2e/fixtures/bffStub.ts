import { test as base, Page, Route } from "@playwright/test";

// CI runs the host's e2e without the BFF or identity-service (the latter
// lives in another repository). These specs exercise the shell, so the BFF
// is replaced at the network layer with the answers it would give; the BFF
// itself is covered by apps/bff's own tests, and the full host + BFF +
// identity path by e2e-full/ (run locally).

export interface AccessStub {
  role: string;
  installedApps: string[];
  grants: Record<string, "view" | "edit">;
  permissions: Record<string, string[]>;
}

export const DEMO_USER = { id: "u1", name: "Демо", email: "demo@example.com" };
// Every app in the host's registry, installed and editable.
export const FULL_ACCESS: AccessStub = {
  role: "owner",
  installedApps: ["recipes", "budget", "recipes-iframe"],
  grants: { recipes: "edit", budget: "edit", "recipes-iframe": "edit" },
  permissions: {},
};

export interface BffStub {
  signedIn: boolean;
  access: AccessStub;
  grantRequests: unknown[];
}

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

export async function stubBff(page: Page, initial: Partial<BffStub> = {}): Promise<BffStub> {
  const state: BffStub = { signedIn: true, access: FULL_ACCESS, grantRequests: [], ...initial };
  const unauthenticated = (route: Route) => json(route, 401, { error: "unauthenticated" });

  await page.route("**/auth/me", (route) =>
    state.signedIn
      ? json(route, 200, { userId: DEMO_USER.id, user: DEMO_USER })
      : unauthenticated(route),
  );
  await page.route("**/auth/login", (route) => {
    const { password } = route.request().postDataJSON() as { password: string };
    if (password !== "correct-horse-battery-staple") {
      return json(route, 401, { error: "invalid_credentials" });
    }
    state.signedIn = true;
    return json(route, 200, { user: DEMO_USER });
  });
  await page.route("**/auth/logout", (route) => {
    state.signedIn = false;
    return json(route, 200, { ok: true });
  });
  await page.route("**/identity/api/auth/organization/list", (route) =>
    state.signedIn
      ? json(route, 200, [{ id: "demo", name: "Семья Ивановых" }])
      : unauthenticated(route),
  );
  await page.route("**/identity/grant-requests", (route) => {
    state.grantRequests.push(route.request().postDataJSON());
    return json(route, 200, { id: "r1" });
  });
  await page.route(/\/api\/h\/[^/]+\/access$/, (route) =>
    state.signedIn ? json(route, 200, state.access) : unauthenticated(route),
  );
  // One "ready" event per connection; EventSource reconnects on its own
  // when the body ends, which is harmless here.
  await page.route(/\/api\/h\/[^/]+\/events$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: 'event: ready\ndata: {"hid":"demo"}\n\n',
    }),
  );
  return state;
}

// Signed in as the demo user with full access, unless a spec reconfigures
// `bff` (it is set up before the spec's first navigation).
export const test = base.extend<{ bff: BffStub }>({
  bff: [
    async ({ page }, use) => {
      await use(await stubBff(page));
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
