import { MountContext } from "./mount";

export interface MfeModule {
  bootstrap(context: MountContext): Promise<void>;
  mount(context: MountContext): Promise<void>;
  unmount(context: MountContext): Promise<void>;
  update(context: MountContext): Promise<void>;
  prefetch(context: MountContext): Promise<void>;
  destroy(context: MountContext): Promise<void>;
}
