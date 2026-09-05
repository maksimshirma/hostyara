import { HostChannel, HostSDK, MountContext } from "@hostyara/contracts";
import { createLifecycle } from "./index";

describe("@hostyara/lifecycle", () => {
  const sdk: HostSDK = {
    auth: { getUser: () => null, isAuthenticated: () => false },
    navigation: { navigate: () => {}, getCurrentRoute: () => "/" },
    notifications: { show: () => {} },
    featureFlags: { isEnabled: () => false },
    permissions: { hasPermission: () => false },
    sharedState: { get: () => ({}), subscribe: () => () => {}, set: () => {} },
    events: { request: async () => undefined, on: () => () => {} } as HostChannel,
  };

  const context: MountContext = {
    hostContext: { userId: "u1", permissions: [] },
    container: document.createElement("div"),
    sdk,
  };

  it("defaults unimplemented methods to no-ops", async () => {
    const lifecycle = createLifecycle({});
    await expect(lifecycle.mount(context)).resolves.toBeUndefined();
  });

  it("allows overriding individual lifecycle methods", async () => {
    const mount = jest.fn(async () => {});
    const lifecycle = createLifecycle({ mount });

    await lifecycle.mount(context);
    expect(mount).toHaveBeenCalledWith(context);
  });
});
