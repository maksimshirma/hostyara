export interface SdkApps {
  open(appId: string, to: string): void;
  canOpen(appId: string): boolean;
}
