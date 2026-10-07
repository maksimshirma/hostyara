import { Location } from "./location";
import { AccessLevel } from "./sdk-access";
import { SdkApiError } from "./sdk-api";
import { SdkContext } from "./sdk-context";

// T16: the initial exchange over window.postMessage that hands a
// MessagePort-backed HostChannel to an app running inside an iframe. Once
// the port is transferred, everything else (navigation, nav, apps, share)
// goes over the channel — these two messages exist only to get there.
export interface IframeReadyMessage {
  type: "hostyara:iframe-ready";
  contract: string;
}

export interface IframeAckMessage {
  type: "hostyara:iframe-ack";
  mode: "household" | "public";
  basename: string;
  context: SdkContext;
  location: Location;
  // sdk.access.level/can() are synchronous, so the embed keeps a local copy:
  // this initial value, then "access.changed" pushes over the channel.
  // Optional: a host predating sdk.access sends none.
  access?: IframeAccessSnapshot;
}

// The app's own access as seen from inside the iframe: its grant level and
// which of its manifest permissions are currently confirmed.
export interface IframeAccessSnapshot {
  level: AccessLevel;
  permissions: string[];
}

// "api.request" answer over the channel. The channel itself only carries an
// error message string, so an SdkApiError travels as a value instead.
export type IframeApiResult = { ok: true; value: unknown } | { ok: false; error: SdkApiError };

export function isIframeReadyMessage(value: unknown): value is IframeReadyMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "hostyara:iframe-ready"
  );
}

export function isIframeAckMessage(value: unknown): value is IframeAckMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "hostyara:iframe-ack"
  );
}
