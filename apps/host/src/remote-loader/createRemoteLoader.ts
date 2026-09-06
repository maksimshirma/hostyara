import { AppManifest, AppModule } from "@hostyara/contracts";
import { init, loadRemote, registerRemotes } from "@module-federation/runtime";
import { createIframeAppModule } from "../iframe-transport";
import { RemoteLoadError } from "./RemoteLoadError";

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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, appId: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new RemoteLoadError(
          "timeout",
          appId,
          `Timed out loading remote "${appId}" after ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * @module-federation/runtime caches a failed script load by URL forever —
 * once a remoteEntry fails to fetch, calling loadRemote() again for the
 * same URL never re-issues the request, so a "retry" would silently do
 * nothing. Appending a distinguishing query param per failed attempt makes
 * each retry a URL the library hasn't seen (and cached as broken) before.
 */
function withRetryParam(url: string, attempt: number): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}retry=${attempt}`;
}

export function createRemoteLoader(): RemoteLoader {
  let federationInitialized = false;
  const registeredRemoteEntries = new Map<string, string>();
  const failedAttempts = new Map<string, number>();
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
    const attempt = failedAttempts.get(manifest.id) ?? 0;
    const entry =
      attempt === 0
        ? manifest.mount.remoteEntry
        : withRetryParam(manifest.mount.remoteEntry, attempt);

    if (registeredRemoteEntries.get(manifest.id) === entry) return;
    // force: true — without it, re-registering an already-known remote
    // name is a silent no-op, so a retry's cache-busted URL would never
    // actually replace the one @module-federation/runtime already failed
    // to load.
    registerRemotes([{ name: manifest.id, entry }], { force: true });
    registeredRemoteEntries.set(manifest.id, entry);
  }

  async function loadOnce(manifest: AppManifest, timeoutMs: number): Promise<AppModule> {
    ensureFederationHost();
    ensureRemoteRegistered(manifest);

    const exposedPath = manifest.mount.exposed.replace(/^\.\//, "");
    try {
      const remoteModule = await withTimeout(
        withoutHeadSideEffects(() => loadRemote(`${manifest.id}/${exposedPath}`)),
        timeoutMs,
        manifest.id,
      );
      return toAppModule(remoteModule, manifest.id);
    } catch (error) {
      if (error instanceof RemoteLoadError) throw error;
      throw new RemoteLoadError("load-failed", manifest.id, errorMessage(error));
    }
  }

  return {
    loadRemoteModule(manifest, timeoutMs = DEFAULT_TIMEOUT_MS) {
      // The iframe transport does its actual connecting inside mount()
      // (that's where the handshake needs a live sdk to bridge against),
      // not here — there's no remote script to fetch or cache by URL.
      if (manifest.mount.type === "iframe") {
        return Promise.resolve(createIframeAppModule(manifest));
      }

      const cached = loadingModules.get(manifest.id);
      if (cached) return cached;

      const promise = loadOnce(manifest, timeoutMs).catch((error: unknown) => {
        loadingModules.delete(manifest.id);
        failedAttempts.set(manifest.id, (failedAttempts.get(manifest.id) ?? 0) + 1);
        throw error;
      });
      loadingModules.set(manifest.id, promise);
      return promise;
    },
  };
}
