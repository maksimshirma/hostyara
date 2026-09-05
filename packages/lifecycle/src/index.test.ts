import { HostSDK, MountContext } from "@hostyara/contracts";
import { createLifecycle } from "./index";

describe("@hostyara/lifecycle", () => {
  const sdk: HostSDK = {
    mode: "household",
    basename: "/h/f3k2xp/a/recipes",
    context: {
      mode: "household",
      hid: "f3k2xp",
      user: { id: "u1", name: "Ada", email: "ada@example.com" },
      permissions: [],
    },
    router: {
      location: { pathname: "/", search: "", hash: "" },
      navigate: () => {},
      subscribe: () => () => {},
      link: (to) => to,
    },
    nav: { setBreadcrumbs: () => {}, setTitle: () => {} },
    apps: { open: () => {}, canOpen: () => false },
    share: {
      create: async () => ({ url: "https://hostyara.app/s/token", expiresAt: "2026-10-05" }),
      list: async () => [],
      revoke: async () => {},
    },
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
