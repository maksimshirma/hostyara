import { MessageChannel as NodeMessageChannel } from "node:worker_threads";
import { createMessagePortChannel } from "../createMessagePortChannel";

// jsdom has no MessageChannel; Node's worker_threads one is DOM-compatible
// enough. Not polyfilled globally (see jest.setup.ts) — it changes React's
// scheduler behavior — so each file that needs it takes it directly.
const MessageChannel = NodeMessageChannel as unknown as typeof globalThis.MessageChannel;

function createConnectedChannels() {
  const { port1, port2 } = new MessageChannel();
  const hostSide = createMessagePortChannel(port1 as unknown as MessagePort);
  const appSide = createMessagePortChannel(port2 as unknown as MessagePort);
  return { hostSide, appSide, close: () => (port1.close(), port2.close()) };
}

describe("createMessagePortChannel", () => {
  it("resolves a request made from one side with the other side's handler result", async () => {
    const { hostSide, appSide, close } = createConnectedChannels();
    appSide.on<{ id: string }, string>("greet", (payload) => `hello ${payload.id}`);

    await expect(hostSide.request("greet", { id: "ada" })).resolves.toBe("hello ada");
    close();
  });

  it("works symmetrically: either side can request, either side can handle", async () => {
    const { hostSide, appSide, close } = createConnectedChannels();
    hostSide.on<undefined, number>("ping", () => 1);

    await expect(appSide.request("ping")).resolves.toBe(1);
    close();
  });

  it("awaits an async handler on the other side before resolving", async () => {
    const { hostSide, appSide, close } = createConnectedChannels();
    appSide.on<undefined, number>("compute", async () => 42);

    await expect(hostSide.request("compute")).resolves.toBe(42);
    close();
  });

  it("rejects when the other side has no handler for the method", async () => {
    const { hostSide, close } = createConnectedChannels();

    await expect(hostSide.request("missing")).rejects.toThrow(
      'No handler registered for method "missing"',
    );
    close();
  });

  it("rejects when the other side's handler throws", async () => {
    const { hostSide, appSide, close } = createConnectedChannels();
    appSide.on("boom", () => {
      throw new Error("kaboom");
    });

    await expect(hostSide.request("boom")).rejects.toThrow("kaboom");
    close();
  });

  it("keeps concurrent in-flight requests independent by id", async () => {
    const { hostSide, appSide, close } = createConnectedChannels();
    let resolveSlow: (value: string) => void = () => {};
    appSide.on("slow", () => new Promise<string>((resolve) => (resolveSlow = resolve)));
    appSide.on<undefined, string>("fast", () => "fast-result");

    const slow = hostSide.request("slow");
    const fast = hostSide.request("fast");
    await expect(fast).resolves.toBe("fast-result");
    resolveSlow("slow-result");
    await expect(slow).resolves.toBe("slow-result");
    close();
  });

  it("stops answering once the handler is unregistered", async () => {
    const { hostSide, appSide, close } = createConnectedChannels();
    const unsubscribe = appSide.on("method", () => "value");
    unsubscribe();

    await expect(hostSide.request("method")).rejects.toThrow(
      'No handler registered for method "method"',
    );
    close();
  });
});
