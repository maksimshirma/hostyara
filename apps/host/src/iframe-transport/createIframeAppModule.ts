import {
  AppManifest,
  AppModule,
  IframeAckMessage,
  isIframeReadyMessage,
} from "@hostyara/contracts";
import { createMessagePortChannel } from "@hostyara/event-bus";
import { getContractMajor } from "@hostyara/registry";
import { bridgeChannelToSdk } from "./bridgeChannelToSdk";

const HANDSHAKE_TIMEOUT_MS = 10000;

function originOf(url: string): string {
  return new URL(url, window.location.href).origin;
}

// The iframe's own script announces readiness (it can't know when the host
// is listening, but the host knows exactly when it appended the iframe).
// Waiting on window "message" here — the dedicated MessagePort doesn't
// exist yet, it's what this handshake hands over.
function waitForReady(iframe: HTMLIFrameElement, expectedOrigin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error(`Iframe app handshake timed out after ${HANDSHAKE_TIMEOUT_MS}ms`));
    }, HANDSHAKE_TIMEOUT_MS);

    function onMessage(event: MessageEvent): void {
      if (event.source !== iframe.contentWindow) return;
      if (event.origin !== expectedOrigin) return;
      if (!isIframeReadyMessage(event.data)) return;

      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(event.data.contract);
    }

    window.addEventListener("message", onMessage);
  });
}

export function createIframeAppModule(manifest: AppManifest): AppModule {
  let iframe: HTMLIFrameElement | null = null;
  let unbindHandlers: Array<() => void> = [];
  let hostPort: MessagePort | null = null;

  return {
    async mount(el, sdk) {
      const expectedOrigin = originOf(manifest.mount.remoteEntry);

      iframe = document.createElement("iframe");
      iframe.src = manifest.mount.remoteEntry;
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      el.append(iframe);

      const embedContract = await waitForReady(iframe, expectedOrigin);
      const expectedMajor = getContractMajor(manifest.contract);
      const actualMajor = getContractMajor(embedContract);
      if (actualMajor !== expectedMajor) {
        iframe.remove();
        iframe = null;
        throw new Error(
          `Iframe app "${manifest.id}" reports contract major "${actualMajor}", ` +
            `manifest declares "${expectedMajor}"`,
        );
      }

      const { port1, port2 } = new MessageChannel();
      hostPort = port1;
      const channel = createMessagePortChannel(port1);
      unbindHandlers = bridgeChannelToSdk(channel, sdk);

      const ack: IframeAckMessage = {
        type: "hostyara:iframe-ack",
        mode: sdk.mode,
        basename: sdk.basename,
        context: sdk.context,
        location: sdk.router.location,
      };
      iframe.contentWindow?.postMessage(ack, expectedOrigin, [port2]);
    },

    async unmount() {
      for (const unbind of unbindHandlers) unbind();
      unbindHandlers = [];
      hostPort?.close();
      hostPort = null;
      iframe?.remove();
      iframe = null;
    },
  };
}
