import { AuthSDK } from "./auth";
import { NavigationSDK } from "./navigation";
import { NotificationsSDK } from "./notifications";
import { FeatureFlagsSDK } from "./feature-flags";
import { PermissionsSDK } from "./permissions";

export * from "./auth";
export * from "./navigation";
export * from "./notifications";
export * from "./feature-flags";
export * from "./permissions";

export interface HostSDK {
  auth: AuthSDK;
  navigation: NavigationSDK;
  notifications: NotificationsSDK;
  featureFlags: FeatureFlagsSDK;
  permissions: PermissionsSDK;
}
