export interface FeatureFlagsSDK {
  isEnabled(flag: string): boolean;
}
