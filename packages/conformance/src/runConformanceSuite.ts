import { AppModule } from "@hostyara/contracts";
import {
  checkCustomElementNamesPrefixed,
  checkDocumentHeadUntouched,
  checkMountUnmountIdempotent,
  checkNoDirectHistoryOrLocationAccess,
  checkReactsToExternalLocationChange,
  checkStorageKeysPrefixed,
  checkSurvivesContextChange,
} from "./checks";

export interface ConformanceOptions {
  appId: string;
  loadAppModule: () => AppModule | Promise<AppModule>;
  // The generic checks here can only verify that reacting to a location
  // push doesn't throw or reload the page — they have no idea what a
  // "reacted" DOM looks like for an arbitrary app. Supply this to also
  // assert something app-specific actually changed.
  expectReactedToLocationChange?: (el: HTMLElement) => void | Promise<void>;
}

// A publishable, framework-agnostic suite any AppModule must pass — run it
// from the app's own Jest test file: runConformanceSuite({ appId: "recipes",
// loadAppModule: () => import("../index").then((m) => m.default) }).
export function runConformanceSuite(options: ConformanceOptions): void {
  const { appId, loadAppModule, expectReactedToLocationChange } = options;

  describe(`AppModule conformance (${appId})`, () => {
    let el: HTMLDivElement;

    beforeEach(() => {
      el = document.createElement("div");
      document.body.append(el);
    });

    afterEach(() => {
      el.remove();
    });

    it("mount/unmount are idempotent and don't leak subscriptions across remounts", async () => {
      const appModule = await loadAppModule();
      await checkMountUnmountIdempotent(appModule, appId, el);
    });

    it("does not modify document.head", async () => {
      const appModule = await loadAppModule();
      await checkDocumentHeadUntouched(appModule, appId, el);
    });

    it("never calls window.history or window.location directly", async () => {
      const appModule = await loadAppModule();
      await checkNoDirectHistoryOrLocationAccess(appModule, appId, el);
    });

    it("prefixes every localStorage/sessionStorage key it writes with its own appId", async () => {
      const appModule = await loadAppModule();
      await checkStorageKeysPrefixed(appModule, appId, el);
    });

    it("prefixes every custom element name it registers with its own appId", async () => {
      const appModule = await loadAppModule();
      await checkCustomElementNamesPrefixed(appModule, appId, el);
    });

    it("reacts to an externally pushed location without a full reload", async () => {
      const appModule = await loadAppModule();
      await checkReactsToExternalLocationChange(
        appModule,
        appId,
        el,
        expectReactedToLocationChange,
      );
    });

    it("survives a context (hid) change without its subscriber throwing", async () => {
      const appModule = await loadAppModule();
      await checkSurvivesContextChange(appModule, appId, el);
    });
  });
}
