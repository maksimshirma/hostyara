import { HostChannel, HostSDK, IframeAckMessage, Location } from "@hostyara/contracts";

// A framework router adapter (createReactRouterHistory et al.) calls
// sdk.router.navigate() then immediately reads sdk.router.location back to
// notify its own listeners synchronously. For a real HostSDK that works,
// since navigate() mutates window.history before returning — but this
// proxy's navigate() only fires a request across the channel, and waiting
// for the round trip would mean the adapter's own synchronous notify still
// sees the old location. Parsing the target here keeps that read correct
// without waiting on the host.
function parseToLocation(to: string): Location {
  const url = new URL(to, "http://internal");
  return { pathname: url.pathname, search: url.search, hash: url.hash };
}

// Builds the same HostSDK shape a Module Federation app gets, backed by
// RPC calls over the channel instead of direct calls into the host's own
// objects. basename/context stay frozen at handshake time — hid/context
// sync across this boundary isn't T17's scope (that's route sync
// specifically); location is live, pushed by createIframeAppModule's
// sdk.router.subscribe forwarding on the host side.
export function createSdkProxy(channel: HostChannel, initial: IframeAckMessage): HostSDK {
  let currentLocation = initial.location;
  const locationListeners = new Set<(location: Location) => void>();

  channel.on<Location, void>("router.locationChanged", (location) => {
    currentLocation = location;
    for (const listener of locationListeners) listener(location);
  });

  return {
    mode: initial.mode,
    basename: initial.basename,
    context: initial.context,
    router: {
      get location() {
        return currentLocation;
      },
      navigate(to, opts) {
        currentLocation = parseToLocation(to);
        void channel.request("router.navigate", { to, opts });
      },
      // Unlike navigate(), the destination isn't known here, so this can't
      // be updated optimistically — a caller reading location right after
      // back() will see the old value until the host's push arrives.
      back() {
        void channel.request("router.back");
      },
      subscribe(callback) {
        locationListeners.add(callback);
        return () => locationListeners.delete(callback);
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
