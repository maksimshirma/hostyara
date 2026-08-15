import { MicrofrontendProps } from "@hostyara/contract";

export interface MicrofrontendLifecycle {
  bootstrap(props: MicrofrontendProps): Promise<void>;
  mount(props: MicrofrontendProps): Promise<void>;
  unmount(props: MicrofrontendProps): Promise<void>;
  update(props: MicrofrontendProps): Promise<void>;
  prefetch(props: MicrofrontendProps): Promise<void>;
  destroy(props: MicrofrontendProps): Promise<void>;
}
