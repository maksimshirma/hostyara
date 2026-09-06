import { AppModule } from "@hostyara/contracts";
import { createConformanceSdk } from "./createConformanceSdk";

// Each check is a standalone async function (not an it() callback) so it
// can be unit-tested directly against both a compliant and a deliberately
// broken fake AppModule — a conformance suite that can't be proven to
// catch a real violation isn't trustworthy (see __jest__/checks.test.ts).
// jest's expect() throws synchronously on failure regardless of whether
// it's called inside an it() block, which is what runConformanceSuite.ts
// relies on to surface these as normal test failures.

// A real macrotask, not just a microtask: React's scheduler (with no
// global MessageChannel — see jest.setup.ts) falls back to setTimeout for
// its own internal queue, so an initial createRoot().render() doesn't
// actually commit until at least one real tick has passed. Every check
// below settles after mount for exactly this reason — Vue commits
// synchronously, but a check that assumes that generically would pass
// against a compliant React app for the wrong reason (never having
// observed its mounted state at all).
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export async function checkMountUnmountIdempotent(
  appModule: AppModule,
  appId: string,
  el: HTMLElement,
): Promise<void> {
  const { sdk, subscriberCount } = createConformanceSdk(appId);

  await appModule.mount(el, sdk);
  await settle();
  const subscribersAfterMount = subscriberCount();
  await appModule.unmount(el);
  await settle();
  expect(subscriberCount()).toBe(0);

  await appModule.mount(el, sdk);
  await settle();
  expect(subscriberCount()).toBe(subscribersAfterMount);
  await appModule.unmount(el);
  await settle();
  expect(subscriberCount()).toBe(0);

  await appModule.unmount(el);
}

export async function checkDocumentHeadUntouched(
  appModule: AppModule,
  appId: string,
  el: HTMLElement,
): Promise<void> {
  const { sdk } = createConformanceSdk(appId);
  const headBefore = document.head.innerHTML;

  await appModule.mount(el, sdk);
  await settle();
  expect(document.head.innerHTML).toBe(headBefore);

  await appModule.unmount(el);
  expect(document.head.innerHTML).toBe(headBefore);
}

export async function checkNoDirectHistoryOrLocationAccess(
  appModule: AppModule,
  appId: string,
  el: HTMLElement,
): Promise<void> {
  const { sdk } = createConformanceSdk(appId);
  // location.assign/replace/href= aren't interceptable via jest.spyOn in
  // jsdom (nor, per createHostRouter's own historyGuard, via
  // Object.defineProperty in any real browser either — legacy platform
  // object accessors). Comparing href before/after catches all three the
  // same way pushState/replaceState get caught by spying directly.
  const pushSpy = jest.spyOn(window.history, "pushState");
  const replaceSpy = jest.spyOn(window.history, "replaceState");
  const hrefBefore = window.location.href;

  try {
    await appModule.mount(el, sdk);
    await settle();
    await appModule.unmount(el);
    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(window.location.href).toBe(hrefBefore);
  } finally {
    pushSpy.mockRestore();
    replaceSpy.mockRestore();
  }
}

export async function checkStorageKeysPrefixed(
  appModule: AppModule,
  appId: string,
  el: HTMLElement,
): Promise<void> {
  const { sdk } = createConformanceSdk(appId);
  const writtenKeys: string[] = [];
  const setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation((key: string) => {
    writtenKeys.push(key);
  });

  try {
    await appModule.mount(el, sdk);
    await settle();
    await appModule.unmount(el);
  } finally {
    setItemSpy.mockRestore();
  }

  for (const key of writtenKeys) {
    expect(key.startsWith(`${appId}:`)).toBe(true);
  }
}

export async function checkCustomElementNamesPrefixed(
  appModule: AppModule,
  appId: string,
  el: HTMLElement,
): Promise<void> {
  const { sdk } = createConformanceSdk(appId);
  const registeredNames: string[] = [];
  const defineSpy = jest.spyOn(customElements, "define").mockImplementation((name: string) => {
    registeredNames.push(name);
  });

  try {
    await appModule.mount(el, sdk);
    await settle();
    await appModule.unmount(el);
  } finally {
    defineSpy.mockRestore();
  }

  for (const name of registeredNames) {
    expect(name.startsWith(`${appId}-`)).toBe(true);
  }
}

export async function checkReactsToExternalLocationChange(
  appModule: AppModule,
  appId: string,
  el: HTMLElement,
  expectReactedToLocationChange?: (el: HTMLElement) => void | Promise<void>,
): Promise<void> {
  const { sdk, pushLocation } = createConformanceSdk(appId);
  // window.location.reload isn't spyable in jsdom either (same
  // non-configurable platform accessor as assign/replace) and a real
  // reload would tear down the JS realm anyway — not something a jsdom
  // unit test can observe either way. "No throw" plus an optional
  // app-specific assertion is what's actually checkable at this level;
  // the host's own e2e suite covers SPA-vs-reload behavior for real.
  await appModule.mount(el, sdk);
  await settle();
  pushLocation({ pathname: "/conformance-probe", search: "", hash: "" });
  await settle();
  if (expectReactedToLocationChange) await expectReactedToLocationChange(el);
  await appModule.unmount(el);
}

export async function checkSurvivesContextChange(
  appModule: AppModule,
  appId: string,
  el: HTMLElement,
): Promise<void> {
  const { sdk, setHid } = createConformanceSdk(appId);

  await appModule.mount(el, sdk);
  await settle();
  setHid("a-different-household");
  await settle();

  expect(sdk.context.mode === "household" && sdk.context.hid).toBe("a-different-household");
  await appModule.unmount(el);
}
