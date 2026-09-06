import { HostChannel, HostSDK, IframeAckMessage } from "@hostyara/contracts";

// Builds the same HostSDK shape a Module Federation app gets, backed by
// RPC calls over the channel instead of direct calls into the host's own
// objects. basename/context/location are frozen at handshake time — the
// host pushing updates for these over the same channel (a hid change, a
// route change from outside) is T17's job, not this transport's.
export function createSdkProxy(channel: HostChannel, initial: IframeAckMessage): HostSDK {
  return {
    mode: initial.mode,
    basename: initial.basename,
    context: initial.context,
    router: {
      location: initial.location,
      navigate(to, opts) {
        void channel.request("router.navigate", { to, opts });
      },
      back() {
        void channel.request("router.back");
      },
      subscribe() {
        return () => {};
      },
      link(to) {
        // Must stay synchronous (used to build a real <a href>) — computed
        // the same way createSdkRouter's toAbsolutePath does, against the
        // basename the handshake already gave us, so no round trip needed.
        const suffix = to === "/" ? "" : to;
        return `${initial.basename}${suffix}`;
      },
    },
    nav: {
      setBreadcrumbs(trail) {
        void channel.request("nav.setBreadcrumbs", trail);
      },
      setTitle(title) {
        void channel.request("nav.setTitle", title);
      },
    },
    apps: {
      open(appId, to) {
        void channel.request("apps.open", { appId, to });
      },
      // Synchronous per contract; the real answer lives on the host. The
      // Module Federation path stubs this the same way today (HostChrome's
      // buildSdk: "canOpen: () => false") — not a regression, matching a
      // pre-existing stand-in until sdk.apps grows an async variant.
      canOpen() {
        return false;
      },
    },
    share: {
      create: (type, id) => channel.request("share.create", { type, id }),
      list: (type, id) => channel.request("share.list", { type, id }),
      revoke: (token) => channel.request("share.revoke", { token }),
    },
  };
}
