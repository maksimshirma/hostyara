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

  it("subscribe is a no-op stub (T17 wires live push updates)", () => {
    const sdk = createSdkProxy(fakeChannel(), fakeAck());
    const listener = jest.fn();

    const unsubscribe = sdk.router.subscribe(listener);
    unsubscribe();

    expect(listener).not.toHaveBeenCalled();
  });
});
