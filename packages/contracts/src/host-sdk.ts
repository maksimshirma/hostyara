import { AuthSDK } from "./auth";
import { NavigationSDK } from "./navigation";
import { NotificationsSDK } from "./notifications";
import { FeatureFlagsSDK } from "./feature-flags";
import { PermissionsSDK } from "./permissions";
import { SharedStateAccessor } from "./shared-state";

export interface HostSDK {
  auth: AuthSDK;
  navigation: NavigationSDK;
  notifications: NotificationsSDK;
  featureFlags: FeatureFlagsSDK;
  permissions: PermissionsSDK;
  sharedState: SharedStateAccessor<Record<string, unknown>>;
}
