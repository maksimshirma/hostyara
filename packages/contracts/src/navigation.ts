export interface NavigationSDK {
  navigate(path: string): void;
  getCurrentRoute(): string;
}
