import { ChannelHandler, HostChannel } from "@hostyara/contracts";

// The in-memory HostChannel (index.ts) works because host and app share one
// object in one realm. Across an iframe boundary there's no shared memory —
// each side gets its own MessagePort from the same MessageChannel, and
// request() on one side has to become a message the other side's on()
// handler answers. Envelopes carry an id so a response can find the
// promise its request created.
interface RequestEnvelope {
  kind: "request";
  id: string;
  method: string;
  payload: unknown;
}

interface ResponseEnvelope {
  kind: "response";
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

type Envelope = RequestEnvelope | ResponseEnvelope;

function isEnvelope(value: unknown): value is Envelope {
  return (
    typeof value === "object" &&
    value !== null &&
    ((value as { kind?: unknown }).kind === "request" ||
      (value as { kind?: unknown }).kind === "response")
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createMessagePortChannel(port: MessagePort): HostChannel {
  const handlers = new Map<string, ChannelHandler>();
  const pending = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  let nextId = 0;

  async function handleRequest(envelope: RequestEnvelope): Promise<void> {
    const handler = handlers.get(envelope.method);
    if (!handler) {
      const response: ResponseEnvelope = {
        kind: "response",
        id: envelope.id,
        ok: false,
        error: `No handler registered for method "${envelope.method}"`,
      };
      port.postMessage(response);
      return;
    }

    try {
      const result = await handler(envelope.payload);
      const response: ResponseEnvelope = { kind: "response", id: envelope.id, ok: true, result };
      port.postMessage(response);
    } catch (error) {
      const response: ResponseEnvelope = {
        kind: "response",
        id: envelope.id,
        ok: false,
        error: errorMessage(error),
      };
      port.postMessage(response);
    }
  }

  function handleResponse(envelope: ResponseEnvelope): void {
    const waiting = pending.get(envelope.id);
    if (!waiting) return;
    pending.delete(envelope.id);
    if (envelope.ok) waiting.resolve(envelope.result);
    else waiting.reject(new Error(envelope.error));
  }

  port.addEventListener("message", (event: MessageEvent) => {
    if (!isEnvelope(event.data)) return;
    if (event.data.kind === "request") void handleRequest(event.data);
    else handleResponse(event.data);
  });
  port.start();

  return {
    request(method, payload) {
      const id = String(nextId++);
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
        const envelope: RequestEnvelope = { kind: "request", id, method, payload };
        port.postMessage(envelope);
      });
    },
    on(method, handler) {
      handlers.set(method, handler as ChannelHandler);
      return () => {
        if (handlers.get(method) === handler) handlers.delete(method);
      };
    },
  } as HostChannel;
}
