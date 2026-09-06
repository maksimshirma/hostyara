import { AppManifest, RegistryEntry } from "@hostyara/contracts";
import { getContractMajor, SUPPORTED_CONTRACT_MAJOR } from "./contract-version";
import { ResolveResult } from "./resolve-result";

export { getContractMajor, SUPPORTED_CONTRACT_MAJOR } from "./contract-version";
export type { ResolveError } from "./resolve-error";
export type { ResolveResult } from "./resolve-result";

export class AppRegistry {
  private entries = new Map<string, RegistryEntry>();

  register(manifest: AppManifest): void {
    this.entries.set(manifest.id, { manifest, registeredAt: new Date().toISOString() });
  }

  unregister(id: string): void {
    this.entries.delete(id);
  }

  get(id: string): RegistryEntry | undefined {
    return this.entries.get(id);
  }

  list(): RegistryEntry[] {
    return Array.from(this.entries.values());
  }

  resolve(appId: string): ResolveResult {
    const entry = this.entries.get(appId);
    if (!entry) {
      return { ok: false, error: { kind: "unknown-app", appId } };
    }

    const actualMajor = getContractMajor(entry.manifest.contract);
    if (actualMajor !== SUPPORTED_CONTRACT_MAJOR) {
      return {
        ok: false,
        error: {
          kind: "incompatible-contract",
          appId,
          expectedMajor: SUPPORTED_CONTRACT_MAJOR,
          actualMajor,
        },
      };
    }

    return { ok: true, manifest: entry.manifest };
  }
}
