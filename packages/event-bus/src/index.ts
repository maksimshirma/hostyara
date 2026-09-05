import { ChannelHandler, HostChannel } from "@hostyara/contracts";

export function createHostChannel(): HostChannel {
  const handlers = new Map<string, ChannelHandler>();

  const request = (method: string, payload?: unknown): Promise<unknown> => {
    const handler = handlers.get(method);
    if (!handler) {
      return Promise.reject(new Error(`No handler registered for method "${method}"`));
    }
    return Promise.resolve(handler(payload));
  };

  const on = (method: string, handler: ChannelHandler): (() => void) => {
    handlers.set(method, handler);
    return () => {
      if (handlers.get(method) === handler) {
        handlers.delete(method);
      }
    };
  };

  return { request, on } as HostChannel;
}
