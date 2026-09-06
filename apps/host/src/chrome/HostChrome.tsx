import { useEffect, useRef, useState } from "react";
import { AppManifest, HostSDK } from "@hostyara/contracts";
import tokensHref from "@hostyara/ui/src/tokens/tokens.css?url";
import { loadRegistry } from "../registry/loadRegistry";
import { createRemoteLoader, RemoteLoadError } from "../remote-loader";
import { createMountManager } from "../mount-manager";
import { AppDock } from "./AppDock";
import { AppSlotStatus } from "./AppSlotStatus";
import { SpaceSwitcherStub } from "./SpaceSwitcherStub";
import { installGlobalErrorHandlers } from "./globalErrorHandlers";
import { SlotErrorReason, SlotStatus } from "./slotStatus";
import styles from "./HostChrome.module.css";

// Stand-in for the real HostSDK (mode/context/router/nav/apps/share come
// from T10/T11) — just enough for a mounted AppModule to receive a
// well-formed sdk argument today.
const fakeSdk: HostSDK = {
  mode: "household",
  basename: "/h/demo",
  context: {
    mode: "household",
    hid: "demo",
    user: { id: "u1", name: "Demo", email: "demo@example.com" },
    permissions: [],
  },
  router: {
    location: { pathname: "/", search: "", hash: "" },
    navigate: () => {},
    subscribe: () => () => {},
    link: (to) => to,
  },
  nav: { setBreadcrumbs: () => {}, setTitle: () => {} },
  apps: { open: () => {}, canOpen: () => false },
  share: {
    create: async () => ({ url: "", expiresAt: "" }),
    list: async () => [],
    revoke: async () => {},
  },
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toSlotErrorReason(error: unknown): SlotErrorReason {
  if (error instanceof RemoteLoadError && error.kind === "timeout") {
    return { kind: "timeout" };
  }
  return { kind: "load-failed", message: errorMessage(error) };
}

export function HostChrome() {
  const slotRef = useRef<HTMLDivElement>(null);
  const attemptedAppIdRef = useRef<string | null>(null);
  const [remoteLoader] = useState(createRemoteLoader);
  const [mountManager] = useState(() => createMountManager(tokensHref));
  const [registry] = useState(loadRegistry);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [slotStatus, setSlotStatus] = useState<SlotStatus>({ kind: "idle" });
  const [lastManifest, setLastManifest] = useState<AppManifest | null>(null);
  const apps = registry.list().map((entry) => entry.manifest);

  useEffect(() => installGlobalErrorHandlers(() => attemptedAppIdRef.current), []);

  async function openApp(manifest: AppManifest) {
    attemptedAppIdRef.current = manifest.id;
    setLastManifest(manifest);
    setSlotStatus({ kind: "loading", appName: manifest.name });

    const resolved = registry.resolve(manifest.id);
    if (!resolved.ok) {
      const reason: SlotErrorReason =
        resolved.error.kind === "unknown-app"
          ? { kind: "not-installed" }
          : {
              kind: "incompatible-contract",
              expectedMajor: resolved.error.expectedMajor,
              actualMajor: resolved.error.actualMajor,
            };
      setSlotStatus({ kind: "error", appName: manifest.name, reason });
      return;
    }

    try {
      const appModule = await remoteLoader.loadRemoteModule(resolved.manifest);
      if (slotRef.current) {
        await mountManager.unmount(slotRef.current);
        await mountManager.mount(slotRef.current, resolved.manifest, appModule, fakeSdk);
      }
      setActiveAppId(manifest.id);
      setSlotStatus({ kind: "mounted" });
    } catch (error) {
      setSlotStatus({ kind: "error", appName: manifest.name, reason: toSlotErrorReason(error) });
    }
  }

  function retry(): void {
    if (lastManifest) void openApp(lastManifest);
  }

  useEffect(() => {
    const slot = slotRef.current;
    return () => {
      if (slot) void mountManager.unmount(slot);
    };
  }, [mountManager]);

  return (
    <div>
      <div className={styles.header}>
        <SpaceSwitcherStub />
        <AppDock apps={apps} activeAppId={activeAppId} onSelect={openApp} />
      </div>
      <AppSlotStatus status={slotStatus} onRetry={retry} />
      <div className={styles.slot} ref={slotRef} />
    </div>
  );
}
