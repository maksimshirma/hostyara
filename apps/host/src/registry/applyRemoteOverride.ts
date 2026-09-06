import { AppManifest } from "@hostyara/contracts";

// T21: lets an author point the live host at their own locally-running dev
// server for one app without editing registry.json —
// ?_remote=recipes@http://localhost:5174/remoteEntry.js. Repeatable for
// more than one app at once; anything not overridden is untouched.
export function parseRemoteOverrides(search: string): Map<string, string> {
  const overrides = new Map<string, string>();
  for (const value of new URLSearchParams(search).getAll("_remote")) {
    const separatorIndex = value.indexOf("@");
    if (separatorIndex <= 0) continue;
    const appId = value.slice(0, separatorIndex);
    const remoteEntry = value.slice(separatorIndex + 1);
    if (remoteEntry) overrides.set(appId, remoteEntry);
  }
  return overrides;
}

export function applyRemoteOverrides(
  manifests: AppManifest[],
  overrides: Map<string, string>,
): AppManifest[] {
  if (overrides.size === 0) return manifests;
  return manifests.map((manifest) => {
    const remoteEntry = overrides.get(manifest.id);
    if (!remoteEntry) return manifest;
    return { ...manifest, mount: { ...manifest.mount, remoteEntry } };
  });
}
