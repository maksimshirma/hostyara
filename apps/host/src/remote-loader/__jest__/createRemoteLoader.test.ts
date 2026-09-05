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

    expect(registerRemotesMock).toHaveBeenCalledWith([
      { name: "recipes", entry: manifest.mount.remoteEntry },
    ]);
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

  it("rejects with a timeout error when the remote never resolves", async () => {
    jest.useFakeTimers();
    loadRemoteMock.mockReturnValue(new Promise(() => {}));
    const loader = createRemoteLoader();

    const promise = loader.loadRemoteModule(manifest, 1000);
    promise.catch(() => {});
    await jest.advanceTimersByTimeAsync(1000);
    await expect(promise).rejects.toThrow('Timed out loading remote "recipes"');
  });

  it("allows retrying after a failed load", async () => {
    loadRemoteMock.mockRejectedValueOnce(new Error("network error"));
    loadRemoteMock.mockResolvedValueOnce(fakeAppModule);
    const loader = createRemoteLoader();

    await expect(loader.loadRemoteModule(manifest)).rejects.toThrow("network error");
    await expect(loader.loadRemoteModule(manifest)).resolves.toBe(fakeAppModule);
    expect(loadRemoteMock).toHaveBeenCalledTimes(2);
  });

  it("throws when the remote does not export mount/unmount", async () => {
    loadRemoteMock.mockResolvedValue({ notAnAppModule: true });
    const loader = createRemoteLoader();

    await expect(loader.loadRemoteModule(manifest)).rejects.toThrow(
      'Remote "recipes" does not export a valid AppModule',
    );
  });
});
