import { HostSDK, IframeReadyMessage, isIframeAckMessage } from "@hostyara/contracts";
import { createMessagePortChannel } from "@hostyara/event-bus";
import { createSdkProxy } from "./createSdkProxy";

export interface ConnectToHostOptions {
  // The app's own contract version — the host compares this against what
  // the manifest declares to catch a deployed bundle that's drifted out of
  // sync with the registry (see createIframeAppModule).
  contract: string;
  // Required rather than inferred from document.referrer: an app embedded
  // via iframe has no other reliable way to know who it should trust, and
  // guessing wrong here is exactly the kind of thing "проверка origin" in
  // T16's goal exists to prevent.
  hostOrigin: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10000;

export function connectToHost(options: ConnectToHostOptions): Promise<HostSDK> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(
        new Error(`connectToHost timed out after ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`),
      );
    }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    function onMessage(event: MessageEvent): void {
      if (event.source !== window.parent) return;
      if (event.origin !== options.hostOrigin) return;
      if (!isIframeAckMessage(event.data)) return;

      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);

      const port = event.ports[0];
      if (!port) {
        reject(new Error("Host ack arrived without a MessagePort"));
        return;
      }

      const channel = createMessagePortChannel(port);
      resolve(createSdkProxy(channel, event.data));
    }

    window.addEventListener("message", onMessage);

    const ready: IframeReadyMessage = { type: "hostyara:iframe-ready", contract: options.contract };
    window.parent.postMessage(ready, options.hostOrigin);
  });
}
