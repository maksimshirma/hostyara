import { AppManifest } from "@hostyara/contracts";

const initMock = jest.fn();
const registerRemotesMock = jest.fn();
const loadRemoteMock = jest.fn();

jest.mock("@module-federation/runtime", () => ({
  init: (...args: unknown[]) => initMock(...args),
  registerRemotes: (...args: unknown[]) => registerRemotesMock(...args),
  loadRemote: (...args: unknown[]) => loadRemoteMock(...args),
}));

import { createRemoteLoader } from "../createRemoteLoader";
import { RemoteLoadError } from "../RemoteLoadError";

const manifest: AppManifest = {
  id: "recipes",
  name: "Рецепты",
  version: "1.0.0",
  contract: "1",
  category: "Кухня",
  tags: [],
  surfaces: {},
  permissions: [],
  entities: [],
  routes: ["/"],
  mount: {
    remoteEntry: "https://cdn.example.com/recipes/remoteEntry.js",
    exposed: "./app",
    styles: [],
  },
  network: { connect: [] },
};

const fakeAppModule = { mount: jest.fn(), unmount: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe("createRemoteLoader", () => {
  it("initializes the federation host with the sdk as the only shared singleton", async () => {
    loadRemoteMock.mockResolvedValue(fakeAppModule);
    const loader = createRemoteLoader();

    await loader.loadRemoteModule(manifest);

    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({
        shared: { "@hostyara/sdk": { shareConfig: { singleton: true, requiredVersion: false } } },
      }),
    );
  });

  it("registers the remote from the manifest and loads its exposed module", async () => {
    loadRemoteMock.mockResolvedValue(fakeAppModule);
    const loader = createRemoteLoader();

    const appModule = await loader.loadRemoteModule(manifest);

    expect(registerRemotesMock).toHaveBeenCalledWith(
      [{ name: "recipes", entry: manifest.mount.remoteEntry }],
      { force: true },
    );
    expect(loadRemoteMock).toHaveBeenCalledWith("recipes/app");
    expect(appModule).toBe(fakeAppModule);
  });

  it("unwraps a default export", async () => {
    loadRemoteMock.mockResolvedValue({ default: fakeAppModule });
    const loader = createRemoteLoader();

    const appModule = await loader.loadRemoteModule(manifest);
    expect(appModule).toBe(fakeAppModule);
  });

  it("does not re-register or re-request the same remote twice", async () => {
    loadRemoteMock.mockResolvedValue(fakeAppModule);
    const loader = createRemoteLoader();

    await loader.loadRemoteModule(manifest);
    await loader.loadRemoteModule(manifest);

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(registerRemotesMock).toHaveBeenCalledTimes(1);
    expect(loadRemoteMock).toHaveBeenCalledTimes(1);
  });

  it("shares the in-flight promise for concurrent requests of the same remote", async () => {
    let resolveRemote: (value: unknown) => void = () => {};
    loadRemoteMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRemote = resolve;
      }),
    );
    const loader = createRemoteLoader();

    const first = loader.loadRemoteModule(manifest);
    const second = loader.loadRemoteModule(manifest);
    resolveRemote(fakeAppModule);

    await expect(first).resolves.toBe(fakeAppModule);
    await expect(second).resolves.toBe(fakeAppModule);
    expect(loadRemoteMock).toHaveBeenCalledTimes(1);
  });

  it("rejects with a typed timeout error when the remote never resolves", async () => {
    jest.useFakeTimers();
    loadRemoteMock.mockReturnValue(new Promise(() => {}));
    const loader = createRemoteLoader();

    const promise = loader.loadRemoteModule(manifest, 1000);
    promise.catch(() => {});
    await jest.advanceTimersByTimeAsync(1000);
    await expect(promise).rejects.toMatchObject({
      kind: "timeout",
      appId: "recipes",
    } satisfies Partial<RemoteLoadError>);
  });

  it("allows retrying after a failed load", async () => {
    loadRemoteMock.mockRejectedValueOnce(new Error("network error"));
    loadRemoteMock.mockResolvedValueOnce(fakeAppModule);
    const loader = createRemoteLoader();

    await expect(loader.loadRemoteModule(manifest)).rejects.toMatchObject({
      kind: "load-failed",
      appId: "recipes",
      message: "network error",
    } satisfies Partial<RemoteLoadError>);
    await expect(loader.loadRemoteModule(manifest)).resolves.toBe(fakeAppModule);
    expect(loadRemoteMock).toHaveBeenCalledTimes(2);
  });

  it("re-registers the remote with a cache-busted URL on retry, since the runtime never re-fetches a URL it already failed to load", async () => {
    loadRemoteMock.mockRejectedValueOnce(new Error("network error"));
    loadRemoteMock.mockResolvedValueOnce(fakeAppModule);
    const loader = createRemoteLoader();

    await loader.loadRemoteModule(manifest).catch(() => {});
    await loader.loadRemoteModule(manifest);

    expect(registerRemotesMock).toHaveBeenNthCalledWith(
      1,
      [{ name: "recipes", entry: manifest.mount.remoteEntry }],
      { force: true },
    );
    expect(registerRemotesMock).toHaveBeenNthCalledWith(
      2,
      [{ name: "recipes", entry: `${manifest.mount.remoteEntry}?retry=1` }],
      { force: true },
    );
  });

  it("rejects with a typed load-failed error when the remote does not export mount/unmount", async () => {
    loadRemoteMock.mockResolvedValue({ notAnAppModule: true });
    const loader = createRemoteLoader();

    await expect(loader.loadRemoteModule(manifest)).rejects.toMatchObject({
      kind: "load-failed",
      appId: "recipes",
      message: 'Remote "recipes" does not export a valid AppModule',
    } satisfies Partial<RemoteLoadError>);
  });

  it("discards a stylesheet the remote's module evaluation injects into document.head", async () => {
    const headChildrenBefore = document.head.children.length;
    loadRemoteMock.mockImplementation(() => {
      const stray = document.createElement("link");
      stray.rel = "stylesheet";
      stray.href = "https://cdn.example.com/recipes/app.css";
      document.head.append(stray);
      return Promise.resolve(fakeAppModule);
    });
    const loader = createRemoteLoader();

    await loader.loadRemoteModule(manifest);

    expect(document.head.children.length).toBe(headChildrenBefore);
  });
});
