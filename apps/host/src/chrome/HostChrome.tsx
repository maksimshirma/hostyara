import { useEffect, useRef, useState } from "react";
import { AppManifest, HostSDK } from "@hostyara/contracts";
import tokensHref from "@hostyara/ui/src/tokens/tokens.css?url";
import { loadRegistry } from "../registry/loadRegistry";
import { createRemoteLoader } from "../remote-loader";
import { createMountManager } from "../mount-manager";
import { AppDock } from "./AppDock";
import { SpaceSwitcherStub } from "./SpaceSwitcherStub";
import styles from "./HostChrome.module.css";

const remoteLoader = createRemoteLoader();
const mountManager = createMountManager(tokensHref);
const registry = loadRegistry();

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

export function HostChrome() {
  const slotRef = useRef<HTMLDivElement>(null);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const apps = registry.list().map((entry) => entry.manifest);

  async function openApp(manifest: AppManifest) {
    setStatus(`Загрузка «${manifest.name}»…`);
    try {
      const appModule = await remoteLoader.loadRemoteModule(manifest);
      if (slotRef.current) {
        await mountManager.unmount(slotRef.current);
        await mountManager.mount(slotRef.current, manifest, appModule, fakeSdk);
      }
      setActiveAppId(manifest.id);
      setStatus("");
    } catch (error) {
      setStatus(`Не удалось загрузить «${manifest.name}»: ${errorMessage(error)}`);
    }
  }

  useEffect(() => {
    const slot = slotRef.current;
    return () => {
      if (slot) void mountManager.unmount(slot);
    };
  }, []);

  return (
    <div>
      <div className={styles.header}>
        <SpaceSwitcherStub />
        <AppDock apps={apps} activeAppId={activeAppId} onSelect={openApp} />
      </div>
      {status && <p className={styles.status}>{status}</p>}
      <div className={styles.slot} ref={slotRef} />
    </div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
