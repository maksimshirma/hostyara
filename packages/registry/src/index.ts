import { AppManifest, AppHealthStatus } from "@hostyara/contract";

export class AppRegistry {
  private apps = new Map<string, AppManifest>();

  register(manifest: AppManifest): void {
    this.apps.set(manifest.id, manifest);
  }

  unregister(id: string): void {
    this.apps.delete(id);
  }

  get(id: string): AppManifest | undefined {
    return this.apps.get(id);
  }

  list(): AppManifest[] {
    return Array.from(this.apps.values());
  }

  updateStatus(id: string, status: AppHealthStatus): void {
    const manifest = this.apps.get(id);
    if (manifest) {
      this.apps.set(id, { ...manifest, status });
    }
  }
}
