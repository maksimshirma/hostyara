import { HostSDK } from "@hostyara/contracts";
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

  const el = document.createElement("div");

  it("defaults unimplemented methods to no-ops", () => {
    const lifecycle = createLifecycle({});
    expect(lifecycle.mount(el, sdk)).toBeUndefined();
    expect(lifecycle.unmount(el)).toBeUndefined();
  });

  it("allows overriding individual lifecycle methods", () => {
    const mount = jest.fn();
    const lifecycle = createLifecycle({ mount });

    lifecycle.mount(el, sdk);
    expect(mount).toHaveBeenCalledWith(el, sdk);
  });
});
