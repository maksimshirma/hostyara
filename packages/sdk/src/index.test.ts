import { HostSDK } from "./index";

describe("@hostyara/sdk", () => {
  it("composes a HostSDK from typed capability interfaces", () => {
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
    };

    expect(sdk.auth.isAuthenticated()).toBe(false);
    expect(sdk.navigation.getCurrentRoute()).toBe("/");
  });
});
