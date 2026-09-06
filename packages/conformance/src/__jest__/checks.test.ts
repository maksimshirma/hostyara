import { AppModule } from "@hostyara/contracts";
import {
  checkCustomElementNamesPrefixed,
  checkDocumentHeadUntouched,
  checkMountUnmountIdempotent,
  checkNoDirectHistoryOrLocationAccess,
  checkReactsToExternalLocationChange,
  checkStorageKeysPrefixed,
  checkSurvivesContextChange,
} from "../checks";

const APP_ID = "widget";

function createTestSlot(): HTMLDivElement {
  const el = document.createElement("div");
  document.body.append(el);
  return el;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("checkMountUnmountIdempotent", () => {
  it("passes a well-behaved AppModule", async () => {
    let unsubscribe: (() => void) | undefined;
    const appModule: AppModule = {
      mount(_el, sdk) {
        unsubscribe = sdk.router.subscribe(() => {});
      },
      unmount() {
        unsubscribe?.();
        unsubscribe = undefined;
      },
    };

    await expect(
      checkMountUnmountIdempotent(appModule, APP_ID, createTestSlot()),
    ).resolves.toBeUndefined();
  });

  it("fails an AppModule that never unsubscribes on unmount", async () => {
    const appModule: AppModule = {
      mount(_el, sdk) {
        sdk.router.subscribe(() => {});
      },
      unmount() {},
    };

    await expect(checkMountUnmountIdempotent(appModule, APP_ID, createTestSlot())).rejects.toThrow(
      /.+/,
    );
  });
});

describe("checkDocumentHeadUntouched", () => {
  it("passes an AppModule that leaves document.head alone", async () => {
    const appModule: AppModule = { mount() {}, unmount() {} };

    await expect(
      checkDocumentHeadUntouched(appModule, APP_ID, createTestSlot()),
    ).resolves.toBeUndefined();
  });

  it("fails an AppModule that injects into document.head", async () => {
    const appModule: AppModule = {
      mount() {
        const style = document.createElement("style");
        document.head.append(style);
      },
      unmount() {},
    };

    await expect(checkDocumentHeadUntouched(appModule, APP_ID, createTestSlot())).rejects.toThrow(
      /.+/,
    );
  });
});

describe("checkNoDirectHistoryOrLocationAccess", () => {
  it("passes an AppModule that never touches window.history/window.location", async () => {
    const appModule: AppModule = { mount() {}, unmount() {} };

    await expect(
      checkNoDirectHistoryOrLocationAccess(appModule, APP_ID, createTestSlot()),
    ).resolves.toBeUndefined();
  });

  it("fails an AppModule that calls history.pushState directly", async () => {
    const appModule: AppModule = {
      mount() {
        window.history.pushState(null, "", "/second-writer");
      },
      unmount() {},
    };

    await expect(
      checkNoDirectHistoryOrLocationAccess(appModule, APP_ID, createTestSlot()),
    ).rejects.toThrow(/.+/);
    // The check must restore its spies even on failure, or the pushState
    // above leaks into every later test in the run.
    window.history.replaceState(null, "", "/");
  });

  it("fails an AppModule that mutates location.href directly", async () => {
    const appModule: AppModule = {
      mount() {
        window.history.replaceState(null, "", "/before-href-mutation");
        window.location.href = "#fragment-only-but-still-a-direct-write";
      },
      unmount() {},
    };

    await expect(
      checkNoDirectHistoryOrLocationAccess(appModule, APP_ID, createTestSlot()),
    ).rejects.toThrow(/.+/);
    window.history.replaceState(null, "", "/");
  });
});

describe("checkStorageKeysPrefixed", () => {
  it("passes an AppModule that prefixes its storage keys with its appId", async () => {
    const appModule: AppModule = {
      mount() {
        localStorage.setItem(`${APP_ID}:preference`, "1");
      },
      unmount() {},
    };

    await expect(
      checkStorageKeysPrefixed(appModule, APP_ID, createTestSlot()),
    ).resolves.toBeUndefined();
    localStorage.clear();
  });

  it("fails an AppModule that writes an unprefixed storage key", async () => {
    const appModule: AppModule = {
      mount() {
        localStorage.setItem("preference", "1");
      },
      unmount() {},
    };

    await expect(checkStorageKeysPrefixed(appModule, APP_ID, createTestSlot())).rejects.toThrow(
      /.+/,
    );
    localStorage.clear();
  });
});

describe("checkCustomElementNamesPrefixed", () => {
  it("passes an AppModule that prefixes its custom element name with its appId", async () => {
    const appModule: AppModule = {
      mount() {
        customElements.define(`${APP_ID}-card`, class extends HTMLElement {});
      },
      unmount() {},
    };

    await expect(
      checkCustomElementNamesPrefixed(appModule, APP_ID, createTestSlot()),
    ).resolves.toBeUndefined();
  });

  it("fails an AppModule that registers an unprefixed custom element", async () => {
    const appModule: AppModule = {
      mount() {
        customElements.define("card", class extends HTMLElement {});
      },
      unmount() {},
    };

    await expect(
      checkCustomElementNamesPrefixed(appModule, APP_ID, createTestSlot()),
    ).rejects.toThrow(/.+/);
  });
});

describe("checkReactsToExternalLocationChange", () => {
  it("passes an AppModule that reacts without reloading", async () => {
    const appModule: AppModule = { mount() {}, unmount() {} };

    await expect(
      checkReactsToExternalLocationChange(appModule, APP_ID, createTestSlot()),
    ).resolves.toBeUndefined();
  });

  it("fails an AppModule whose subscriber throws on an external change", async () => {
    const appModule: AppModule = {
      mount(_el, sdk) {
        sdk.router.subscribe(() => {
          throw new Error("boom");
        });
      },
      unmount() {},
    };

    await expect(
      checkReactsToExternalLocationChange(appModule, APP_ID, createTestSlot()),
    ).rejects.toThrow(/.+/);
  });

  it("fails when the caller's own reaction assertion fails", async () => {
    const appModule: AppModule = { mount() {}, unmount() {} };

    await expect(
      checkReactsToExternalLocationChange(appModule, APP_ID, createTestSlot(), () => {
        throw new Error("expected something to have changed");
      }),
    ).rejects.toThrow("expected something to have changed");
  });
});

describe("checkSurvivesContextChange", () => {
  it("passes an AppModule whose subscriber tolerates a hid-only change", async () => {
    const appModule: AppModule = {
      mount(_el, sdk) {
        sdk.router.subscribe(() => {});
      },
      unmount() {},
    };

    await expect(
      checkSurvivesContextChange(appModule, APP_ID, createTestSlot()),
    ).resolves.toBeUndefined();
  });

  it("fails an AppModule whose subscriber throws on a hid-only change", async () => {
    const appModule: AppModule = {
      mount(_el, sdk) {
        sdk.router.subscribe(() => {
          throw new Error("boom");
        });
      },
      unmount() {},
    };

    await expect(checkSurvivesContextChange(appModule, APP_ID, createTestSlot())).rejects.toThrow(
      /.+/,
    );
  });
});
