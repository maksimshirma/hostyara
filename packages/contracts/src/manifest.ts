import { Permission } from "./permissions";
import { FeatureFlag } from "./feature-flags";
import { RemoteDescriptor } from "./remote";

export type AppHealthStatus = "healthy" | "degraded" | "down";

export interface AppManifest {
  id: string;
  name: string;
  namespace: string;
  routes: string[];
  version: string;
  remote: RemoteDescriptor;
  permissions: Permission[];
  featureFlags: FeatureFlag[];
  status: AppHealthStatus;
}
