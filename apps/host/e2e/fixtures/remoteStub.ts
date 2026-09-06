import type { Page } from "@playwright/test";

// A "test remote stub": rather than standing up a whole separate MFE app
// for the handful of failure paths e2e needs to exercise against a real
// browser (Jest already covers these via mocked loadRemote — this is only
// for what a mock can't: the host's actual RemoteLoadError/timeout wiring
// against a genuine failed/hung network request), intercept the real
// remote's script instead.
export async function stubRemoteAsFailing(page: Page, remoteEntryUrl: string): Promise<void> {
  await page.route(remoteEntryUrl, (route) => route.abort("failed"));
}

export async function stubRemoteAsHanging(page: Page, remoteEntryUrl: string): Promise<void> {
  await page.route(remoteEntryUrl, () => {
    // Deliberately never calls continue/abort/fulfill — the request just
    // hangs, exercising the host's own load timeout.
  });
}
