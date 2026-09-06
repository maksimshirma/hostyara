import { HostChannel, HostSDK } from "@hostyara/contracts";

// Registers the host side of every request the embed-side proxy sdk can
// make (createIframeAppModule wires the transport; this wires what it
// carries). Router push notifications (host -> app on a route change) are
// T17's job — this only answers calls the app initiates.
export function bridgeChannelToSdk(channel: HostChannel, sdk: HostSDK): Array<() => void> {
  return [
    channel.on<{ to: string; opts?: { replace?: boolean } }, void>("router.navigate", (payload) =>
      sdk.router.navigate(payload.to, payload.opts),
    ),
    channel.on<undefined, void>("router.back", () => sdk.router.back()),
    channel.on<{ to: string }, string>("router.link", (payload) => sdk.router.link(payload.to)),
    channel.on<Parameters<HostSDK["nav"]["setBreadcrumbs"]>[0], void>(
      "nav.setBreadcrumbs",
      (trail) => sdk.nav.setBreadcrumbs(trail),
    ),
    channel.on<string, void>("nav.setTitle", (title) => sdk.nav.setTitle(title)),
    channel.on<{ appId: string; to: string }, void>("apps.open", (payload) =>
      sdk.apps.open(payload.appId, payload.to),
    ),
    channel.on<{ appId: string }, boolean>("apps.canOpen", (payload) =>
      sdk.apps.canOpen(payload.appId),
    ),
    channel.on<{ type: string; id: string }, { url: string; expiresAt: string }>(
      "share.create",
      (payload) => sdk.share.create(payload.type, payload.id),
    ),
    channel.on<{ type: string; id: string }, ReturnType<HostSDK["share"]["list"]>>(
      "share.list",
      (payload) => sdk.share.list(payload.type, payload.id),
    ),
    channel.on<{ token: string }, void>("share.revoke", (payload) =>
      sdk.share.revoke(payload.token),
    ),
  ];
}
