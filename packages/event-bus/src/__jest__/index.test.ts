import { createHostChannel } from "../index";

describe("createHostChannel", () => {
  it("resolves a request with the registered handler's return value", async () => {
    const channel = createHostChannel();
    channel.on<{ id: string }, string>("greet", (payload) => `hello ${payload.id}`);

    await expect(channel.request("greet", { id: "ada" })).resolves.toBe("hello ada");
  });

  it("awaits an async handler before resolving the request", async () => {
    const channel = createHostChannel();
    channel.on<undefined, number>("compute", async () => 42);

    await expect(channel.request("compute")).resolves.toBe(42);
  });

  it("rejects a request with no registered handler", async () => {
    const channel = createHostChannel();

    await expect(channel.request("missing")).rejects.toThrow(
      'No handler registered for method "missing"',
    );
  });

  it("replaces the handler when the same method is registered again", async () => {
    const channel = createHostChannel();
    channel.on("method", () => "first");
    channel.on("method", () => "second");

    await expect(channel.request("method")).resolves.toBe("second");
  });

  it("unregisters the handler when the subscription is cancelled", async () => {
    const channel = createHostChannel();
    const unsubscribe = channel.on("method", () => "value");

    unsubscribe();

    await expect(channel.request("method")).rejects.toThrow(
      'No handler registered for method "method"',
    );
  });
});
