import { Crumb } from "./crumb";

export interface SdkNav {
  setBreadcrumbs(trail: Crumb[]): void;
  setTitle(title: string): void;
}
