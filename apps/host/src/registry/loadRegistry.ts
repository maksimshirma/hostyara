import { AppManifest } from "@hostyara/contracts";
import { AppRegistry } from "@hostyara/registry";
import registryData from "./registry.json";

export function loadRegistry(): AppRegistry {
  const registry = new AppRegistry();
  for (const manifest of registryData as AppManifest[]) {
    registry.register(manifest);
  }
  return registry;
}
