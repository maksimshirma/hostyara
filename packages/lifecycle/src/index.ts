import { AppModule } from "@hostyara/contracts";

const noop = () => {};

export function createLifecycle(overrides: Partial<AppModule>): AppModule {
  return {
    mount: noop,
    unmount: noop,
    ...overrides,
  };
}
