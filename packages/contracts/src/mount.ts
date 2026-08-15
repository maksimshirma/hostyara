import { HostContext } from "./host-context";
import { HostSDK } from "./host-sdk";

export interface MountContext {
  container: HTMLElement;
  hostContext: HostContext;
  sdk: HostSDK;
}
