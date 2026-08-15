import { HostSDK } from "./index";

describe("@hostyara/sdk", () => {
  it("re-exports HostSDK from @hostyara/contracts", () => {
    const sdk: HostSDK = {
      auth: {
        getUser: () => null,
        isAuthenticated: () => false,
      },
      navigation: {
        navigate: () => {},
        getCurrentRoute: () => "/",
      },
      notifications: {
        show: () => {},
      },
      featureFlags: {
        isEnabled: () => false,
      },
      permissions: {
        hasPermission: () => false,
      },
      sharedState: {
        get: () => ({}),
        subscribe: () => () => {},
        set: () => {},
      },
    };

    expect(sdk.auth.isAuthenticated()).toBe(false);
    expect(sdk.navigation.getCurrentRoute()).toBe("/");
  });
});
