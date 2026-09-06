import { AppModule, HostSDK } from "@hostyara/contracts";
import { runDevHarness } from "../runDevHarness";
import { DevHarnessSdk } from "../createDevHarnessSdk";

function fakeAppModule(): AppModule & {
  mountedEl?: HTMLElement;
  mountedSdk?: HostSDK;
  unmountedEl?: HTMLElement;
} {
  const appModule: AppModule & {
    mountedEl?: HTMLElement;
    mountedSdk?: HostSDK;
    unmountedEl?: HTMLElement;
  } = {
    mount(el, sdk) {
      appModule.mountedEl = el;
      appModule.mountedSdk = sdk;
    },
    unmount(el) {
      appModule.unmountedEl = el;
    },
  };
  return appModule;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("runDevHarness", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("normalizes the starting pathname to / instead of the static harness file's own path", async () => {
    window.history.replaceState(null, "", "/standalone.html?foo=bar#hash");
    const appModule = fakeAppModule();

    await runDevHarness(appModule, { appId: "recipes" });

    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("?foo=bar");
    expect(window.location.hash).toBe("#hash");
  });

  it("honors an explicit startPath instead of the default /", async () => {
    window.history.replaceState(null, "", "/standalone.html");
    const appModule = fakeAppModule();

    await runDevHarness(appModule, { appId: "recipes", startPath: "/r/8421" });

    expect(window.location.pathname).toBe("/r/8421");
  });

  it("mounts into an open shadow root on a data-app host element, mirroring the real mount manager", async () => {
    const appModule = fakeAppModule();

    await runDevHarness(appModule, { appId: "recipes" });

    const host = document.querySelector('[data-app="recipes"]');
    expect(host).not.toBeNull();
    expect(host?.shadowRoot?.mode).toBe("open");
    expect(host?.shadowRoot?.contains(appModule.mountedEl!)).toBe(true);
  });

  it("passes an sdk with a household context and a ui stub carrying the real shadow root", async () => {
    const appModule = fakeAppModule();

    await runDevHarness(appModule, { appId: "recipes", hid: "my-test-hid" });

    const sdk = appModule.mountedSdk as DevHarnessSdk;
    expect(sdk.mode).toBe("household");
    expect(sdk.context).toMatchObject({ mode: "household", hid: "my-test-hid" });
    expect(sdk.ui.styleRoot).toBeInstanceOf(ShadowRoot);
    const host = document.querySelector('[data-app="recipes"]');
    expect(sdk.ui.styleRoot).toBe(host?.shadowRoot);
  });

  it("returns a dispose function that unmounts the app and removes the host element", async () => {
    const appModule = fakeAppModule();

    const dispose = await runDevHarness(appModule, { appId: "recipes" });
    const mountedEl = appModule.mountedEl;
    await dispose();

    expect(appModule.unmountedEl).toBe(mountedEl);
    expect(document.querySelector('[data-app="recipes"]')).toBeNull();
  });

  it("router.navigate drives the real address bar and notifies subscribers", async () => {
    const appModule = fakeAppModule();
    await runDevHarness(appModule, { appId: "recipes" });
    const sdk = appModule.mountedSdk as DevHarnessSdk;
    const listener = jest.fn();
    sdk.router.subscribe(listener);

    sdk.router.navigate("/r/8421");

    expect(window.location.pathname).toBe("/r/8421");
    expect(sdk.router.location.pathname).toBe("/r/8421");
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ pathname: "/r/8421" }));
    window.history.replaceState(null, "", "/");
  });
});
