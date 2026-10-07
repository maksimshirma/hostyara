import {
  HostChannel,
  HostSDK,
  IframeApiResult,
  isSdkApiError,
  SdkApiRequestInit,
} from "@hostyara/contracts";

interface ApiRequestPayload {
  service: string;
  path: string;
  init?: SdkApiRequestInit;
}

async function answerApiRequest(
  sdk: HostSDK,
  payload: ApiRequestPayload,
): Promise<IframeApiResult> {
  try {
    return { ok: true, value: await sdk.api.request(payload.service, payload.path, payload.init) };
  } catch (error) {
    return {
      ok: false,
      error: isSdkApiError(error)
        ? error
        : { name: "SdkApiError", code: "network_error", status: 0 },
    };
  }
}

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
    // The host's own sdk.api already pins the app's id and household — the
    // iframe cannot reach another app's backend through this either.
    channel.on<ApiRequestPayload, IframeApiResult>("api.request", (payload) =>
      answerApiRequest(sdk, payload),
    ),
    channel.on<{ level: "view" | "edit" }, void>("access.requestAccess", (payload) =>
      sdk.access.requestAccess(payload.level),
    ),
  ];
}
