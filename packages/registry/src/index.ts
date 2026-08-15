import { AppHealthStatus, AppManifest, RegistryEntry } from "@hostyara/contracts";

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

  updateStatus(id: string, status: AppHealthStatus): void {
    const entry = this.entries.get(id);
    if (entry) {
      this.entries.set(id, { ...entry, manifest: { ...entry.manifest, status } });
    }
  }
}
