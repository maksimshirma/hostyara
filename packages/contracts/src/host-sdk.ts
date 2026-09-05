import { SdkApps } from "./sdk-apps";
import { SdkContext } from "./sdk-context";
import { SdkNav } from "./sdk-nav";
import { SdkRouter } from "./sdk-router";
import { SdkShare } from "./sdk-share";

export interface HostSDK {
  readonly mode: "household" | "public";
  readonly basename: string;
  readonly context: SdkContext;
  router: SdkRouter;
  nav: SdkNav;
  apps: SdkApps;
  share: SdkShare;
}
