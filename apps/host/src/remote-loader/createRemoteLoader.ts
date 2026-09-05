import { AppManifest, AppModule } from "@hostyara/contracts";
import { init, loadRemote, registerRemotes } from "@module-federation/runtime";

export interface RemoteLoader {
  loadRemoteModule(manifest: AppManifest, timeoutMs?: number): Promise<AppModule>;
}

const DEFAULT_TIMEOUT_MS = 10000;
const STYLE_SELECTOR = "style,link[rel='stylesheet']";

/**
 * Evaluating a remote's exposed module can run CSS side effects (some
 * bundlers' own runtime inserts a <link> into document.head regardless of
 * extraction config — see T6). That evaluation happens here, inside
 * loadRemote(), before any shadow root exists to receive it, so there's
 * nowhere sensible to relocate it — mount-manager already applies the
 * manifest's real stylesheet into each shadow root independently, so any
 * stray head insertion is pure duplication and safe to discard.
 */
async function withoutHeadSideEffects<T>(run: () => Promise<T>): Promise<T> {
  const strayNodes: Element[] = [];
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element && node.matches(STYLE_SELECTOR)) {
          strayNodes.push(node);
        }
      }
    }
  });

  observer.observe(document.head, { childList: true });
  try {
    return await run();
  } finally {
    observer.disconnect();
    for (const node of strayNodes) {
      node.remove();
    }
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function toAppModule(remoteModule: unknown, appId: string): AppModule {
  const candidate =
    remoteModule && typeof remoteModule === "object" && "default" in remoteModule
      ? (remoteModule as { default: unknown }).default
      : remoteModule;

  const maybeAppModule = candidate as Partial<AppModule> | null | undefined;
  if (typeof maybeAppModule?.mount !== "function" || typeof maybeAppModule.unmount !== "function") {
    throw new Error(`Remote "${appId}" does not export a valid AppModule`);
  }

  return maybeAppModule as AppModule;
}

export function createRemoteLoader(): RemoteLoader {
  let federationInitialized = false;
  const registeredRemotes = new Set<string>();
  const loadingModules = new Map<string, Promise<AppModule>>();

  function ensureFederationHost(): void {
    if (federationInitialized) return;
    init({
      name: "host",
      remotes: [],
      shared: {
        "@hostyara/sdk": { shareConfig: { singleton: true, requiredVersion: false } },
      },
    });
    federationInitialized = true;
  }

  function ensureRemoteRegistered(manifest: AppManifest): void {
    if (registeredRemotes.has(manifest.id)) return;
    registerRemotes([{ name: manifest.id, entry: manifest.mount.remoteEntry }]);
    registeredRemotes.add(manifest.id);
  }

  async function loadOnce(manifest: AppManifest, timeoutMs: number): Promise<AppModule> {
    ensureFederationHost();
    ensureRemoteRegistered(manifest);

    const exposedPath = manifest.mount.exposed.replace(/^\.\//, "");
    const remoteModule = await withTimeout(
      withoutHeadSideEffects(() => loadRemote(`${manifest.id}/${exposedPath}`)),
      timeoutMs,
      `Timed out loading remote "${manifest.id}" after ${timeoutMs}ms`,
    );

    return toAppModule(remoteModule, manifest.id);
  }

  return {
    loadRemoteModule(manifest, timeoutMs = DEFAULT_TIMEOUT_MS) {
      const cached = loadingModules.get(manifest.id);
      if (cached) return cached;

      const promise = loadOnce(manifest, timeoutMs).catch((error: unknown) => {
        loadingModules.delete(manifest.id);
        throw error;
      });
      loadingModules.set(manifest.id, promise);
      return promise;
    },
  };
}
