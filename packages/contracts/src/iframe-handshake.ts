import { Location } from "./location";
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
}

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
