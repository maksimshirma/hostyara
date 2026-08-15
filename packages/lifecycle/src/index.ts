import { MfeModule } from "@hostyara/contracts";

const noop = async () => {};

export function createLifecycle(overrides: Partial<MfeModule>): MfeModule {
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
