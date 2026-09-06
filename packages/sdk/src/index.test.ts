import { HostSDK } from "./index";

describe("@hostyara/sdk", () => {
  it("re-exports HostSDK from @hostyara/contracts", () => {
    const sdk: HostSDK = {
      mode: "public",
      basename: "/s/token",
      context: { mode: "public", type: "recipe", id: "8421" },
      router: {
        location: { pathname: "/", search: "", hash: "" },
        navigate: () => {},
        back: () => {},
        subscribe: () => () => {},
        link: (to) => to,
      },
      nav: {
        setBreadcrumbs: () => {},
        setTitle: () => {},
      },
      apps: {
        open: () => {},
        canOpen: () => false,
      },
      share: {
        create: async () => ({ url: "https://hostyara.app/s/token", expiresAt: "2026-10-05" }),
        list: async () => [],
        revoke: async () => {},
      },
    };

    expect(sdk.mode).toBe("public");
    expect(sdk.router.location.pathname).toBe("/");
  });
});
