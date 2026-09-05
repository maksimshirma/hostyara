import { Location } from "./location";

export interface SdkRouter {
  location: Location;
  navigate(to: string, opts?: { replace?: boolean }): void;
  subscribe(cb: (loc: Location) => void): () => void;
  link(to: string): string;
}
