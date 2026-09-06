import { useEffect, useRef, useState } from "react";
import { HostSDK } from "@hostyara/contracts";
import tokensHref from "@hostyara/ui/src/tokens/tokens.css?url";
import { loadRegistry } from "../registry/loadRegistry";
import { createRemoteLoader, RemoteLoadError } from "../remote-loader";
import { createMountManager } from "../mount-manager";
import {
  buildAppPath,
  createHostRouter,
  createSdkRouter,
  HostRouter,
  installDevHistoryGuard,
  loadHouseholds,
  Route,
} from "../router";
import { AppDock } from "./AppDock";
import { AppSlotStatus } from "./AppSlotStatus";
import { SpaceSwitcherStub } from "./SpaceSwitcherStub";
import { installGlobalErrorHandlers } from "./globalErrorHandlers";
import { SlotErrorReason, SlotStatus } from "./slotStatus";
import styles from "./HostChrome.module.css";

// The one household in packages/router/households.json — stands in for
// "the person's last active space" until account/session (out of scope
// here) picks a real one.
const DEFAULT_HID = "demo";

// nav/apps/share are still stand-ins (no breadcrumbs, cross-app links, or
// sharing built yet) — router is the real thing, wired to the host's own
// router via createSdkRouter.
function buildSdk(hid: string, basename: string, hostRouter: HostRouter): HostSDK {
  return {
    mode: "household",
    basename,
    context: {
      mode: "household",
      hid,
      user: { id: "u1", name: "Demo", email: "demo@example.com" },
      permissions: [],
    },
    router: createSdkRouter(hostRouter, basename),
    nav: { setBreadcrumbs: () => {}, setTitle: () => {} },
    apps: { open: () => {}, canOpen: () => false },
    share: {
      create: async () => ({ url: "", expiresAt: "" }),
      list: async () => [],
      revoke: async () => {},
    },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toSlotErrorReason(error: unknown): SlotErrorReason {
  if (error instanceof RemoteLoadError && error.kind === "timeout") {
    return { kind: "timeout" };
  }
  return { kind: "load-failed", message: errorMessage(error) };
}

interface LastAttempt {
  hid: string;
  appId: string;
  basename: string;
}

export function HostChrome() {
  const slotRef = useRef<HTMLDivElement>(null);
  const attemptedAppIdRef = useRef<string | null>(null);
  const openGenerationRef = useRef(0);
  const [remoteLoader] = useState(createRemoteLoader);
  const [mountManager] = useState(() => createMountManager(tokensHref));
  const [registry] = useState(loadRegistry);
  const [router] = useState(() => createHostRouter(loadHouseholds()));
  const [route, setRoute] = useState<Route>(() => router.getRoute());
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [slotStatus, setSlotStatus] = useState<SlotStatus>({ kind: "idle" });
  const [lastAttempt, setLastAttempt] = useState<LastAttempt | null>(null);
  const apps = registry.list().map((entry) => entry.manifest);
  const hidSegment = route.kind === "space" ? route.hidSegment : DEFAULT_HID;
  const activeAppIdRef = useRef(activeAppId);
  activeAppIdRef.current = activeAppId;

  useEffect(() => installGlobalErrorHandlers(() => attemptedAppIdRef.current), []);

  useEffect(() => installDevHistoryGuard(() => activeAppIdRef.current), []);

  useEffect(() => {
    if (router.getRoute().kind === "not-found" && window.location.pathname === "/") {
      router.navigate(`/h/${DEFAULT_HID}`, { replace: true });
    }
    const detach = router.attach();
    const unsubscribe = router.subscribe(() => setRoute(router.getRoute()));
    return () => {
      detach();
      unsubscribe();
    };
  }, [router]);

  // A route change (dock click, popstate, or the deep-link effect below
  // firing twice under StrictMode) can call openApp again before a prior
  // call finishes. The generation counter lets a superseded call detect
  // that and back out instead of racing another mount into the same slot.
  async function openApp(hid: string, appId: string, basename: string) {
    const generation = ++openGenerationRef.current;
    attemptedAppIdRef.current = appId;
    setLastAttempt({ hid, appId, basename });

    const resolved = registry.resolve(appId);
    const appName = resolved.ok ? resolved.manifest.name : appId;

    if (!resolved.ok) {
      const reason: SlotErrorReason =
        resolved.error.kind === "unknown-app"
          ? { kind: "not-installed" }
          : {
              kind: "incompatible-contract",
              expectedMajor: resolved.error.expectedMajor,
              actualMajor: resolved.error.actualMajor,
            };
      if (generation === openGenerationRef.current)
        setSlotStatus({ kind: "error", appName, reason });
      return;
    }

    setSlotStatus({ kind: "loading", appName });

    try {
      const appModule = await remoteLoader.loadRemoteModule(resolved.manifest);
      if (generation !== openGenerationRef.current) return;

      if (slotRef.current) {
        await mountManager.unmount(slotRef.current);
        if (generation !== openGenerationRef.current) return;
        await mountManager.mount(
          slotRef.current,
          resolved.manifest,
          appModule,
          buildSdk(hid, basename, router),
        );
        if (generation !== openGenerationRef.current) {
          await mountManager.unmount(slotRef.current);
          return;
        }
      }

      setActiveAppId(appId);
      setSlotStatus({ kind: "mounted" });
    } catch (error) {
      if (generation === openGenerationRef.current) {
        setSlotStatus({ kind: "error", appName, reason: toSlotErrorReason(error) });
      }
    }
  }

  // Direct load of a deep link (cold start) goes through the same path as
  // a dock click: the route changes, this effect reacts to it. Once an app
  // is mounted, its own router adapter is already subscribed to sdk.router
  // directly, so it updates its internal screen on its own — remounting
  // here on every route change (including a mounted app's own framework
  // router replacing its initial location) created an actual infinite
  // mount → navigate → remount loop, caught only by React's "Maximum
  // update depth exceeded" guard. Only re-open when the target app
  // actually differs from what's already mounted.
  useEffect(() => {
    if (route.kind === "space" && route.area.kind === "app" && route.area.appId !== activeAppId) {
      void openApp(route.hid, route.area.appId, route.area.basename);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, activeAppId]);

  function selectApp(appId: string): void {
    router.navigate(buildAppPath(hidSegment, appId));
  }

  function retry(): void {
    if (lastAttempt) void openApp(lastAttempt.hid, lastAttempt.appId, lastAttempt.basename);
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
        <AppDock
          apps={apps}
          activeAppId={activeAppId}
          hidSegment={hidSegment}
          onSelect={selectApp}
        />
      </div>
      <AppSlotStatus status={slotStatus} onRetry={retry} />
      <div className={styles.slot} ref={slotRef} />
    </div>
  );
}
