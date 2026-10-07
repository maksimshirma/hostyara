import { ChannelHandler, HostChannel, IframeAckMessage } from "@hostyara/contracts";
import { createSdkProxy } from "../createSdkProxy";

function fakeAck(overrides: Partial<IframeAckMessage> = {}): IframeAckMessage {
  return {
    type: "hostyara:iframe-ack",
    mode: "household",
    basename: "/h/f3k2xp-semya-ivanovyh/a/recipes",
    context: {
      mode: "household",
      hid: "f3k2xp",
      user: { id: "u1", name: "Demo", email: "demo@example.com" },
      permissions: [],
    },
    location: { pathname: "/r/8421", search: "", hash: "" },
    ...overrides,
  };
}

function fakeChannel(): HostChannel & { handlers: Map<string, ChannelHandler> } {
  const handlers = new Map<string, ChannelHandler>();
  return {
    handlers,
    request: jest.fn(() => Promise.resolve(undefined)),
    on: jest.fn((method: string, handler: ChannelHandler) => {
      handlers.set(method, handler);
      return () => handlers.delete(method);
    }),
  } as unknown as HostChannel & { handlers: Map<string, ChannelHandler> };
}

describe("createSdkProxy", () => {
  it("exposes mode/basename/context/location from the handshake snapshot", () => {
    const ack = fakeAck();
    const sdk = createSdkProxy(fakeChannel(), ack);

    expect(sdk.mode).toBe("household");
    expect(sdk.basename).toBe(ack.basename);
    expect(sdk.context).toEqual(ack.context);
    expect(sdk.router.location).toEqual(ack.location);
  });

  it("forwards router.navigate as a channel request", () => {
    const channel = fakeChannel();
    const sdk = createSdkProxy(channel, fakeAck());

    sdk.router.navigate("/r/999", { replace: true });

    expect(channel.request).toHaveBeenCalledWith("router.navigate", {
      to: "/r/999",
      opts: { replace: true },
    });
  });

  it("updates router.location synchronously on navigate, without waiting for the round trip", () => {
    const channel = fakeChannel();
    const sdk = createSdkProxy(channel, fakeAck());

    sdk.router.navigate("/r/999?servings=2#steps");

    expect(sdk.router.location).toEqual({
      pathname: "/r/999",
      search: "?servings=2",
      hash: "#steps",
    });
  });

  it("forwards router.back as a channel request", () => {
    const channel = fakeChannel();
    const sdk = createSdkProxy(channel, fakeAck());

    sdk.router.back();

    expect(channel.request).toHaveBeenCalledWith("router.back");
  });

  it("computes link() locally against the handshake basename, without a round trip", () => {
    const channel = fakeChannel();
    const sdk = createSdkProxy(channel, fakeAck({ basename: "/h/x/a/recipes" }));

    expect(sdk.router.link("/r/42")).toBe("/h/x/a/recipes/r/42");
    expect(sdk.router.link("/")).toBe("/h/x/a/recipes");
    expect(channel.request).not.toHaveBeenCalled();
  });

  it("forwards nav.setBreadcrumbs and nav.setTitle", () => {
    const channel = fakeChannel();
    const sdk = createSdkProxy(channel, fakeAck());

    sdk.nav.setBreadcrumbs([{ label: "Home" }]);
    sdk.nav.setTitle("Recipe");

    expect(channel.request).toHaveBeenCalledWith("nav.setBreadcrumbs", [{ label: "Home" }]);
    expect(channel.request).toHaveBeenCalledWith("nav.setTitle", "Recipe");
  });

  it("forwards apps.open and stubs apps.canOpen synchronously", () => {
    const channel = fakeChannel();
    const sdk = createSdkProxy(channel, fakeAck());

    sdk.apps.open("budget", "/tx/1");

    expect(channel.request).toHaveBeenCalledWith("apps.open", { appId: "budget", to: "/tx/1" });
    expect(sdk.apps.canOpen("budget")).toBe(false);
  });

  it("forwards share.create/list/revoke and resolves with the channel's result", async () => {
    const channel = fakeChannel();
    (channel.request as jest.Mock).mockResolvedValue({ url: "https://x", expiresAt: "2030" });
    const sdk = createSdkProxy(channel, fakeAck());

    await expect(sdk.share.create("recipe", "8421")).resolves.toEqual({
      url: "https://x",
      expiresAt: "2030",
    });
    expect(channel.request).toHaveBeenCalledWith("share.create", { type: "recipe", id: "8421" });
  });

  it("updates router.location and notifies subscribers when the host pushes a change", () => {
    const channel = fakeChannel();
    const sdk = createSdkProxy(channel, fakeAck());
    const listener = jest.fn();
    sdk.router.subscribe(listener);

    const pushed = { pathname: "/r/999", search: "", hash: "" };
    channel.handlers.get("router.locationChanged")?.(pushed);

    expect(sdk.router.location).toEqual(pushed);
    expect(listener).toHaveBeenCalledWith(pushed);
  });

  it("stops notifying a location change after unsubscribe", () => {
    const channel = fakeChannel();
    const sdk = createSdkProxy(channel, fakeAck());
    const listener = jest.fn();
    const unsubscribe = sdk.router.subscribe(listener);
    unsubscribe();

    channel.handlers.get("router.locationChanged")?.({ pathname: "/r/1", search: "", hash: "" });

    expect(listener).not.toHaveBeenCalled();
  });

  describe("api", () => {
    it("unwraps a successful result", async () => {
      const channel = fakeChannel();
      (channel.request as jest.Mock).mockResolvedValue({ ok: true, value: [1, 2] });
      const sdk = createSdkProxy(channel, fakeAck());

      await expect(sdk.api.request("recipes", "/items", { query: { q: "a" } })).resolves.toEqual([
        1, 2,
      ]);
      expect(channel.request).toHaveBeenCalledWith("api.request", {
        service: "recipes",
        path: "/items",
        init: { query: { q: "a" } },
      });
    });

    it("rethrows the host's SdkApiError as-is", async () => {
      const channel = fakeChannel();
      const error = {
        name: "SdkApiError",
        code: "http_error",
        status: 422,
        body: { field: "title" },
      };
      (channel.request as jest.Mock).mockResolvedValue({ ok: false, error });
      const sdk = createSdkProxy(channel, fakeAck());

      await expect(sdk.api.request("recipes", "/items")).rejects.toEqual(error);
    });

    it("turns a broken channel into network_error", async () => {
      const channel = fakeChannel();
      (channel.request as jest.Mock).mockRejectedValue(
        new Error('No handler registered for method "api.request"'),
      );
      const sdk = createSdkProxy(channel, fakeAck());

      await expect(sdk.api.request("recipes", "/items")).rejects.toEqual({
        name: "SdkApiError",
        code: "network_error",
        status: 0,
      });
    });
  });

  describe("access", () => {
    it("starts from the handshake snapshot", () => {
      const sdk = createSdkProxy(
        fakeChannel(),
        fakeAck({ access: { level: "edit", permissions: ["storage.own"] } }),
      );

      expect(sdk.access.level).toBe("edit");
      expect(sdk.access.can("edit")).toBe(true);
      expect(sdk.access.can("storage.own")).toBe(true);
      expect(sdk.access.can("notifications.send")).toBe(false);
    });

    it("grants nothing when the host sent no snapshot", () => {
      const sdk = createSdkProxy(fakeChannel(), fakeAck());

      expect(sdk.access.level).toBe("view");
      expect(sdk.access.can("edit")).toBe(false);
    });

    it("applies pushed changes and notifies subscribers", () => {
      const channel = fakeChannel();
      const sdk = createSdkProxy(channel, fakeAck({ access: { level: "edit", permissions: [] } }));
      const callback = jest.fn();
      const unsubscribe = sdk.access.subscribe(callback);

      channel.handlers.get("access.changed")!({ level: "view", permissions: [] });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(sdk.access.can("edit")).toBe(false);
      unsubscribe();
      channel.handlers.get("access.changed")!({ level: "edit", permissions: [] });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("forwards requestAccess to the host", async () => {
      const channel = fakeChannel();
      const sdk = createSdkProxy(channel, fakeAck());

      await sdk.access.requestAccess("edit");

      expect(channel.request).toHaveBeenCalledWith("access.requestAccess", { level: "edit" });
    });
  });
});
