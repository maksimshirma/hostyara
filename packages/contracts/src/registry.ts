import { AppManifest } from "./manifest";

export interface RegistryEntry {
  manifest: AppManifest;
  registeredAt: string;
}
