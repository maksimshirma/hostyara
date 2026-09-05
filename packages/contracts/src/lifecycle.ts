import { HostSDK } from "./host-sdk";

export interface AppModule {
  mount(el: HTMLElement, sdk: HostSDK): void | Promise<void>;
  unmount(el: HTMLElement): void | Promise<void>;
}
