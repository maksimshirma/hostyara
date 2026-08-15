import { MicrofrontendLifecycle } from "./types";

export * from "./types";

const noop = async () => {};

export function createLifecycle(
  overrides: Partial<MicrofrontendLifecycle>,
): MicrofrontendLifecycle {
  return {
    bootstrap: noop,
    mount: noop,
    unmount: noop,
    update: noop,
    prefetch: noop,
    destroy: noop,
    ...overrides,
  };
}
