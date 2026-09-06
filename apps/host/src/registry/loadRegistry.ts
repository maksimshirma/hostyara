import { AppManifest } from "@hostyara/contracts";
import { AppRegistry } from "@hostyara/registry";
import { applyRemoteOverrides, parseRemoteOverrides } from "./applyRemoteOverride";
import registryData from "./registry.json";

export function loadRegistry(): AppRegistry {
  const registry = new AppRegistry();
  const overrides = parseRemoteOverrides(window.location.search);
  const manifests = applyRemoteOverrides(registryData as AppManifest[], overrides);
  for (const manifest of manifests) {
    registry.register(manifest);
  }
  return registry;
}
