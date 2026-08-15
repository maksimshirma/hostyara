export type AppHealthStatus = "healthy" | "degraded" | "down";

export interface AppManifest {
  id: string;
  name: string;
  remoteEntryUrl: string;
  routes: string[];
  version: string;
  permissions: string[];
  featureFlags: string[];
  status: AppHealthStatus;
}
