/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://host.example.com"}
 */
// window.postMessage only delivers when targetOrigin matches the target
// window's actual origin (or "*") — since window.parent === window here
// (no real parent frame), the document's own origin has to be hostOrigin
// for connectToHost's real postMessage call to reach this test's listener.
import { MessageChannel as NodeMessageChannel } from "node:worker_threads";
import { IframeAckMessage, isIframeReadyMessage } from "@hostyara/contracts";
import { connectToHost } from "../connectToHost";

// jsdom has no MessageChannel; Node's worker_threads one is DOM-compatible
// enough. Not polyfilled globally (see jest.setup.ts) — it changes React's
// scheduler behavior — so this file shadows the identifier locally instead
// of mutating globalThis.
const MessageChannel = NodeMessageChannel as unknown as typeof globalThis.MessageChannel;

const HOST_ORIGIN = "http://host.example.com";

// window.parent === window at the top of a normal (non-nested) jsdom
// document, so a real round trip can be simulated within one test: reply
// to the embed's "ready" broadcast as if this window were the host.
function respondToReadyWithAck(ack: Omit<IframeAckMessage, "type">): {
  port1: MessagePort;
  port2: MessagePort;
} {
  const { port1, port2 } = new MessageChannel();
  const onMessage = (event: MessageEvent): void => {
    if (!isIframeReadyMessage(event.data)) return;
    window.removeEventListener("message", onMessage);
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "hostyara:iframe-ack", ...ack },
        origin: HOST_ORIGIN,
        source: window.parent,
        ports: [port2] as unknown as MessagePort[],
      }),
    );
  };
  window.addEventListener("message", onMessage);
  return { port1, port2 };
}

const ACK_PAYLOAD = {
  mode: "household" as const,
  basename: "/h/f3k2xp-semya-ivanovyh/a/widget",
  context: {
    mode: "household" as const,
    hid: "f3k2xp",
    user: { id: "u1", name: "Demo", email: "demo@example.com" },
    permissions: [],
  },
  location: { pathname: "/", search: "", hash: "" },
};

describe("connectToHost", () => {
  it("announces readiness with its own contract and resolves an sdk from the host's ack", async () => {
    const readySpy = jest.fn();
    window.addEventListener("message", (event) => {
      if (isIframeReadyMessage(event.data)) readySpy(event.data);
    });
    const { port1, port2 } = respondToReadyWithAck(ACK_PAYLOAD);

    const sdk = await connectToHost({ contract: "1.2.0", hostOrigin: HOST_ORIGIN });

    expect(readySpy).toHaveBeenCalledWith({ type: "hostyara:iframe-ready", contract: "1.2.0" });
    expect(sdk.basename).toBe(ACK_PAYLOAD.basename);
    expect(sdk.context).toEqual(ACK_PAYLOAD.context);
    port1.close();
    port2.close();
  });

  it("ignores an ack from an unexpected origin", async () => {
    const { port1, port2 } = new MessageChannel();
    const onMessage = (event: MessageEvent): void => {
      if (!isIframeReadyMessage(event.data)) return;
      window.removeEventListener("message", onMessage);
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "hostyara:iframe-ack", ...ACK_PAYLOAD },
          origin: "http://attacker.example.com",
          source: window.parent,
          ports: [port2] as unknown as MessagePort[],
        }),
      );
    };
    window.addEventListener("message", onMessage);

    await expect(
      connectToHost({ contract: "1.0.0", hostOrigin: HOST_ORIGIN, timeoutMs: 50 }),
    ).rejects.toThrow(/timed out/);
    port1.close();
    port2.close();
  });

  it("rejects after timeoutMs when the host never acks", async () => {
    await expect(
      connectToHost({ contract: "1.0.0", hostOrigin: HOST_ORIGIN, timeoutMs: 30 }),
    ).rejects.toThrow(/timed out/);
  });

  it("the resolved sdk's router.navigate forwards over the transferred port", async () => {
    const { port1, port2 } = respondToReadyWithAck(ACK_PAYLOAD);
    const sdk = await connectToHost({ contract: "1.0.0", hostOrigin: HOST_ORIGIN });

    const received = new Promise<{ method: string; payload: unknown }>((resolve) => {
      port1.addEventListener(
        "message",
        (event: MessageEvent) => resolve(event.data as { method: string; payload: unknown }),
        { once: true },
      );
    });
    port1.start();

    sdk.router.navigate("/detail");

    const request = await received;
    expect(request.method).toBe("router.navigate");
    expect(request.payload).toEqual({ to: "/detail", opts: undefined });
    port1.close();
    port2.close();
  });
});
