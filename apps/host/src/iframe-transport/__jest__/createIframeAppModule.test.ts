import { MessageChannel, MessagePort } from "node:worker_threads";
import { AppManifest, HostSDK } from "@hostyara/contracts";
import { createIframeAppModule } from "../createIframeAppModule";

// jsdom has no MessageChannel, and createIframeAppModule constructs one at
// runtime — it needs a real global here. Not polyfilled in jest.setup.ts
// globally: React's scheduler switches its own task scheduling when it
// finds one, leaking a port in every React Testing Library test. This
// file doesn't touch React, so mutating its own isolated jsdom global is
// safe.
globalThis.MessageChannel = MessageChannel as unknown as typeof globalThis.MessageChannel;
globalThis.MessagePort = MessagePort as unknown as typeof globalThis.MessagePort;

const REMOTE_ENTRY = "http://embed.example.com/index.html";
const EXPECTED_ORIGIN = "http://embed.example.com";

function fakeManifest(overrides: Partial<AppManifest> = {}): AppManifest {
  return {
    id: "widget",
    name: "Widget",
    version: "1.0.0",
    contract: "1.0.0",
    category: "utility",
    tags: [],
    surfaces: {} as AppManifest["surfaces"],
    permissions: [],
    entities: [],
    routes: [],
    mount: { type: "iframe", remoteEntry: REMOTE_ENTRY, exposed: "", styles: [] },
    network: { connect: [] },
    ...overrides,
  };
}

function fakeSdk(): HostSDK {
  return {
    mode: "household",
    basename: "/h/demo/a/widget",
    context: {
      mode: "household",
      hid: "demo",
      user: { id: "u1", name: "Demo", email: "demo@example.com" },
      permissions: [],
    },
    router: {
      location: { pathname: "/", search: "", hash: "" },
      navigate: jest.fn(),
      back: jest.fn(),
      subscribe: jest.fn(() => () => {}),
      link: jest.fn((to: string) => `/h/demo/a/widget${to === "/" ? "" : to}`),
    },
    nav: { setBreadcrumbs: jest.fn(), setTitle: jest.fn() },
    apps: { open: jest.fn(), canOpen: jest.fn(() => true) },
    share: {
      create: jest.fn().mockResolvedValue({ url: "u", expiresAt: "e" }),
      list: jest.fn().mockResolvedValue([]),
      revoke: jest.fn().mockResolvedValue(undefined),
    },
  };
}

function dispatchReady(
  iframe: HTMLIFrameElement,
  contract: string,
  origin = EXPECTED_ORIGIN,
): void {
  window.dispatchEvent(
    new MessageEvent("message", {
      data: { type: "hostyara:iframe-ready", contract },
      origin,
      source: iframe.contentWindow,
    }),
  );
}

// jsdom only gives an iframe a contentWindow once it's connected to the
// live document — a detached slot element never gets one.
function attachedSlot(): HTMLDivElement {
  const el = document.createElement("div");
  document.body.append(el);
  return el;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("createIframeAppModule", () => {
  it("creates an iframe pointed at mount.remoteEntry", async () => {
    const el = attachedSlot();
    const appModule = createIframeAppModule(fakeManifest());

    const mountPromise = appModule.mount(el, fakeSdk());
    const iframe = el.querySelector("iframe");
    expect(iframe?.src).toBe(REMOTE_ENTRY);
    // jsdom can't actually navigate the iframe cross-origin, so its real
    // postMessage wouldn't deliver anyway — mock it out so the transferred
    // port doesn't leak as a real, unclosed worker_threads handle.
    const postMessageSpy = jest
      .spyOn(iframe!.contentWindow!, "postMessage")
      .mockImplementation(() => {});

    dispatchReady(iframe!, "1.0.0");
    await mountPromise;
    (postMessageSpy.mock.calls[0] as unknown as [unknown, string, MessagePort[]])[2][0].close();
    await appModule.unmount(el);
  });

  it("sends an ack with a transferred port once the embed announces readiness", async () => {
    const el = attachedSlot();
    const sdk = fakeSdk();
    const appModule = createIframeAppModule(fakeManifest());

    const mountPromise = appModule.mount(el, sdk);
    const iframe = el.querySelector("iframe")!;
    const postMessageSpy = jest
      .spyOn(iframe.contentWindow!, "postMessage")
      .mockImplementation(() => {});

    dispatchReady(iframe, "1.0.0");
    await mountPromise;

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const [ack, origin, transfer] = postMessageSpy.mock.calls[0] as unknown as [
      unknown,
      string,
      MessagePort[],
    ];
    expect(ack).toMatchObject({
      type: "hostyara:iframe-ack",
      mode: "household",
      basename: sdk.basename,
      context: sdk.context,
      location: sdk.router.location,
    });
    expect(origin).toBe(EXPECTED_ORIGIN);
    expect(transfer).toHaveLength(1);
    transfer[0].close();
    await appModule.unmount(el);
  });

  it("ignores a ready message from a different origin", async () => {
    const el = attachedSlot();
    const appModule = createIframeAppModule(fakeManifest());

    const mountPromise = appModule.mount(el, fakeSdk());
    const iframe = el.querySelector("iframe")!;
    const postMessageSpy = jest
      .spyOn(iframe.contentWindow!, "postMessage")
      .mockImplementation(() => {});
    dispatchReady(iframe, "1.0.0", "http://attacker.example.com");
    dispatchReady(iframe, "1.0.0", EXPECTED_ORIGIN);

    await expect(mountPromise).resolves.toBeUndefined();
    (postMessageSpy.mock.calls[0] as unknown as [unknown, string, MessagePort[]])[2][0].close();
    await appModule.unmount(el);
  });

  it("rejects and removes the iframe when the embed's contract major doesn't match the manifest's", async () => {
    const el = attachedSlot();
    const appModule = createIframeAppModule(fakeManifest({ contract: "1.0.0" }));

    const mountPromise = appModule.mount(el, fakeSdk());
    const iframe = el.querySelector("iframe")!;
    dispatchReady(iframe, "2.0.0");

    await expect(mountPromise).rejects.toThrow(/contract major/);
    expect(el.querySelector("iframe")).toBeNull();
  });

  it("bridges a router.navigate request from the embed to the real sdk", async () => {
    const el = attachedSlot();
    const sdk = fakeSdk();
    const appModule = createIframeAppModule(fakeManifest());

    const mountPromise = appModule.mount(el, sdk);
    const iframe = el.querySelector("iframe")!;
    const postMessageSpy = jest
      .spyOn(iframe.contentWindow!, "postMessage")
      .mockImplementation(() => {});
    dispatchReady(iframe, "1.0.0");
    await mountPromise;

    const embedPort = (
      postMessageSpy.mock.calls[0] as unknown as [unknown, string, MessagePort[]]
    )[2][0];
    const gotResponse = new Promise<void>((resolve) => {
      embedPort.addEventListener("message", () => resolve(), { once: true });
    });
    embedPort.start();
    embedPort.postMessage({
      kind: "request",
      id: "req-1",
      method: "router.navigate",
      payload: { to: "/detail", opts: { replace: true } },
    });
    // Waits for the host's response envelope rather than an arbitrary
    // delay — worker_threads' MessagePort (the jsdom polyfill, see
    // jest.setup.ts) delivers across a real macrotask, not a microtask.
    await gotResponse;

    expect(sdk.router.navigate).toHaveBeenCalledWith("/detail", { replace: true });
    embedPort.close();
    await appModule.unmount(el);
  });

  it("removes the iframe and stops bridging on unmount", async () => {
    const el = attachedSlot();
    const sdk = fakeSdk();
    const appModule = createIframeAppModule(fakeManifest());

    const mountPromise = appModule.mount(el, sdk);
    const iframe = el.querySelector("iframe")!;
    const postMessageSpy = jest
      .spyOn(iframe.contentWindow!, "postMessage")
      .mockImplementation(() => {});
    dispatchReady(iframe, "1.0.0");
    await mountPromise;
    (postMessageSpy.mock.calls[0] as unknown as [unknown, string, MessagePort[]])[2][0].close();

    await appModule.unmount(el);

    expect(el.querySelector("iframe")).toBeNull();
  });
});
