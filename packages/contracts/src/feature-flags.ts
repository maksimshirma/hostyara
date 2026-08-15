export type FeatureFlag = string;

export interface FeatureFlagsSDK {
  isEnabled(flag: FeatureFlag): boolean;
}
