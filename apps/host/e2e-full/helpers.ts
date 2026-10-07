import type { Page } from "@playwright/test";
import { createIdentityDatabase } from "../../bff/src/test/identity-env";

export const PASSWORD = "correct-horse-battery-staple";
const run = Date.now().toString(36);
export const email = (name: string) => `${name}-${run}@example.com`;

// A call to the BFF from inside the page, so it carries the page's real
// __Host-session cookie and Fetch Metadata — exactly what the shell sends.
export async function bff<T = any>(
  page: Page,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ path, body }) => {
      const res = await fetch(path, {
        method: body === undefined ? "GET" : "POST",
        headers: body === undefined ? {} : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : undefined };
    },
    { path, body },
  );
}

// identity-service has no install API (its own tests write the table too).
// Installing would trigger access.changed in a real install flow, so the
// BFF is told the same way identity tells it.
export async function installApps(hid: string, appIds: string[]): Promise<void> {
  const db = createIdentityDatabase();
  try {
    for (const appId of appIds) {
      await db.query(
        `insert into installed_apps (hid, "appId") values ($1, $2) on conflict do nothing`,
        [hid, appId],
      );
    }
  } finally {
    await db.end();
  }
  await fetch("http://localhost:4001/webhooks/access-changed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hid }),
  });
}

export function hidFromUrl(url: string): string {
  const segment = new URL(url).pathname.split("/")[2];
  return segment.split("-")[0];
}
