import { useRef, useState } from "react";
import { HostSDK } from "@hostyara/contracts";
import { Button } from "@hostyara/ui";
import tokensHref from "@hostyara/ui/src/tokens/tokens.css?url";
import { ThemePreference, useTheme } from "./theme";
import { loadRegistry } from "./registry/loadRegistry";
import { createRemoteLoader } from "./remote-loader";
import { createMountManager } from "./mount-manager";
import styles from "./App.module.css";

const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];

// Temporary smoke-test harness for T6/T7: proves the remote loader and mount
// manager can load and render a real Module Federation remote. Replaced by
// the real dock/routing wiring in T8-T10.
const remoteLoader = createRemoteLoader();
const mountManager = createMountManager(tokensHref);

const fakeSdk: HostSDK = {
  mode: "household",
  basename: "/h/demo/a/recipes",
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

function RemoteHarness() {
  const slotRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("idle");

  async function loadApp(appId: string) {
    setStatus(`loading ${appId}`);
    try {
      const registry = loadRegistry();
      const result = registry.resolve(appId);
      if (!result.ok) {
        setStatus(`error: ${result.error.kind}`);
        return;
      }

      const appModule = await remoteLoader.loadRemoteModule(result.manifest);
      if (slotRef.current) {
        await mountManager.unmount(slotRef.current);
        await mountManager.mount(slotRef.current, result.manifest, appModule, fakeSdk);
      }
      setStatus(`mounted ${appId}`);
    } catch (error) {
      setStatus(`error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function switchTenTimes() {
    for (let i = 0; i < 10; i++) {
      await loadApp(i % 2 === 0 ? "recipes" : "budget");
    }
  }

  return (
    <div>
      <button type="button" onClick={() => loadApp("recipes")}>
        Load recipes remote
      </button>
      <button type="button" onClick={() => loadApp("budget")}>
        Load budget remote
      </button>
      <button type="button" onClick={switchTenTimes}>
        Switch 10x
      </button>
      <p>Status: {status}</p>
      <div ref={slotRef} />
    </div>
  );
}

export default function App() {
  const { preference, theme, setPreference } = useTheme();

  return (
    <div className={styles.container}>
      <h1>Welcome to Hostyara</h1>
      <p>Host/shell application for a family super-app</p>
      <Button>Click me</Button>
      <div className={styles.themeSwitcher} role="radiogroup" aria-label="Theme">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={preference === option}
            className={preference === option ? styles.themeOptionActive : styles.themeOption}
            onClick={() => setPreference(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <p className={styles.themeStatus}>Active theme: {theme}</p>
      <RemoteHarness />
    </div>
  );
}
