import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AccessLevel, User } from "@hostyara/contracts";
import tokensHref from "@hostyara/ui/src/tokens/tokens.css?url";
import { AccessTracker } from "../api/accessTracker";
import { BffClient } from "../api/bffClient";
import { loadRegistry } from "../registry/loadRegistry";
import { createRemoteLoader, RemoteLoadError } from "../remote-loader";
import { createMountManager } from "../mount-manager";
import {
  buildAppPath,
  createHostRouter,
  createHouseholdLookup,
  Household,
  installDevHistoryGuard,
  Route,
} from "../router";
import { AppAccessDecision, decideAppAccess } from "./appAccess";
import { AppDock } from "./AppDock";
import { buildSdk } from "./buildSdk";
import { AppSlotStatus } from "./AppSlotStatus";
import { SpaceSwitcherStub } from "./SpaceSwitcherStub";
import { installGlobalErrorHandlers } from "./globalErrorHandlers";
import { SlotErrorReason, SlotStatus } from "./slotStatus";
import { createObservability, DevOverlay } from "../observability";
import styles from "./HostChrome.module.css";

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
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
  appId: string;
}

const DENIED_REASONS: Record<Exclude<AppAccessDecision, "allow" | "pending">, SlotErrorReason> = {
  "not-installed": { kind: "not-installed" },
  "no-grant": { kind: "no-access", requested: false },
  "not-member": { kind: "not-member" },
  unavailable: { kind: "access-unavailable" },
};

export interface HostChromeProps {
  bff: BffClient;
  // Follows the open household; HostChrome points it at route.hid.
  accessTracker: AccessTracker;
  user: User;
  // The person's households; never empty (the session gate asks to create
  // one first). The first is where a bare "/" lands.
  households: Household[];
  onLogout: () => void;
}

export function HostChrome({ bff, accessTracker, user, households, onLogout }: HostChromeProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const attemptedAppIdRef = useRef<string | null>(null);
  const attemptedVersionRef = useRef<string | null>(null);
  const openGenerationRef = useRef(0);
  const [remoteLoader] = useState(createRemoteLoader);
  const [mountManager] = useState(() => createMountManager(tokensHref));
  const [registry] = useState(loadRegistry);
  const [observability] = useState(() => createObservability());
  const householdsRef = useRef(households);
  householdsRef.current = households;
  const [router] = useState(() =>
    createHostRouter({
      resolve: (hid) => createHouseholdLookup(householdsRef.current).resolve(hid),
    }),
  );
  const [route, setRoute] = useState<Route>(() => router.getRoute());
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [slotStatus, setSlotStatus] = useState<SlotStatus>({ kind: "idle" });
  const [lastAttempt, setLastAttempt] = useState<LastAttempt | null>(null);
  // "hid/appId" pairs this tab already sent an access request for.
  const [requestedAccess, setRequestedAccess] = useState<string[]>([]);
  const accessStatus = useSyncExternalStore(accessTracker.subscribe, accessTracker.getStatus);
  const accessSnapshot = useSyncExternalStore(accessTracker.subscribe, accessTracker.getSnapshot);
  const defaultHid = households[0].hid;
  const currentHid = route.kind === "space" ? route.hid : null;
  const hidSegment = route.kind === "space" ? route.hidSegment : defaultHid;
  const household = createHouseholdLookup(households).resolve(currentHid ?? defaultHid);
  // The dock lists what is installed in this household once that is known.
  const apps = registry
    .list()
    .map((entry) => entry.manifest)
    .filter((manifest) => !accessSnapshot || accessSnapshot.installedApps.includes(manifest.id));
  const activeAppIdRef = useRef(activeAppId);
  activeAppIdRef.current = activeAppId;

  useEffect(
    () =>
      installGlobalErrorHandlers(
        () => ({ appId: attemptedAppIdRef.current, remoteVersion: attemptedVersionRef.current }),
        (context, error, source) =>
          observability.reportError({ ...context, source, message: errorMessage(error) }),
      ),
    [observability],
  );

  useEffect(() => installDevHistoryGuard(() => activeAppIdRef.current), []);

  useEffect(() => {
    if (router.getRoute().kind === "not-found" && window.location.pathname === "/") {
      router.navigate(`/h/${householdsRef.current[0].hid}`, { replace: true });
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
  async function openApp(appId: string) {
    const generation = ++openGenerationRef.current;
    attemptedAppIdRef.current = appId;
    attemptedVersionRef.current = null;
    setLastAttempt({ appId });

    const resolveStart = performance.now();
    const resolved = registry.resolve(appId);
    observability.reportMetric({
      kind: "resolve",
      appId,
      durationMs: performance.now() - resolveStart,
    });
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

    attemptedVersionRef.current = resolved.manifest.version;
    setSlotStatus({ kind: "loading", appName });

    try {
      const loadStart = performance.now();
      const appModule = await remoteLoader.loadRemoteModule(resolved.manifest);
      observability.reportMetric({
        kind: "load",
        appId,
        durationMs: performance.now() - loadStart,
      });
      if (generation !== openGenerationRef.current) return;

      if (slotRef.current) {
        await mountManager.unmount(slotRef.current);
        if (generation !== openGenerationRef.current) return;
        const mountStart = performance.now();
        await mountManager.mount(
          slotRef.current,
          resolved.manifest,
          appModule,
          buildSdk(appId, router, { bff, accessTracker, user }),
        );
        observability.reportMetric({
          kind: "mount",
          appId,
          durationMs: performance.now() - mountStart,
        });
        if (generation !== openGenerationRef.current) {
          await mountManager.unmount(slotRef.current);
          return;
        }
        // Fire-and-forget: an approximate "did it actually paint" signal,
        // not something the mount flow itself should wait on — nothing
        // downstream depends on this metric landing before the app is
        // considered mounted.
        void nextFrame().then(() => {
          observability.reportMetric({
            kind: "first-frame",
            appId,
            durationMs: performance.now() - mountStart,
          });
        });
      }

      setActiveAppId(appId);
      setSlotStatus({ kind: "mounted" });
    } catch (error) {
      if (generation === openGenerationRef.current) {
        setSlotStatus({ kind: "error", appName, reason: toSlotErrorReason(error) });
      }
      observability.reportError({
        appId,
        remoteVersion: resolved.manifest.version,
        source: "load-failed",
        message: errorMessage(error),
      });
    }
  }

  useEffect(() => {
    accessTracker.setHid(currentHid);
    return () => accessTracker.setHid(null);
  }, [accessTracker, currentHid]);

  function appNameOf(appId: string): string {
    const resolved = registry.resolve(appId);
    return resolved.ok ? resolved.manifest.name : appId;
  }

  // IA 13.7: without access the app is not mounted — or is unmounted if
  // access went away while it was open — and the shell shows why. The URL
  // stays, so the app comes back by itself once access is granted.
  async function showDenied(appId: string, reason: SlotErrorReason) {
    ++openGenerationRef.current;
    setSlotStatus({ kind: "error", appName: appNameOf(appId), reason });
    if (activeAppIdRef.current !== null && slotRef.current) {
      setActiveAppId(null);
      await mountManager.unmount(slotRef.current);
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
    if (route.kind !== "space" || route.area.kind !== "app") return;
    const appId = route.area.appId;
    const decision = decideAppAccess(accessStatus, accessSnapshot, appId);
    if (decision === "pending") {
      if (appId !== activeAppId) setSlotStatus({ kind: "loading", appName: appNameOf(appId) });
      return;
    }
    if (decision !== "allow") {
      const reason =
        decision === "no-grant"
          ? {
              kind: "no-access" as const,
              requested: requestedAccess.includes(`${route.hid}/${appId}`),
            }
          : DENIED_REASONS[decision];
      void showDenied(appId, reason);
      return;
    }
    if (appId !== activeAppId) void openApp(appId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, activeAppId, accessStatus, accessSnapshot, requestedAccess]);

  function selectApp(appId: string): void {
    router.navigate(buildAppPath(hidSegment, appId));
  }

  function retry(): void {
    if (slotStatus.kind === "error" && slotStatus.reason.kind === "access-unavailable") {
      void accessTracker.refresh();
      return;
    }
    if (lastAttempt) void openApp(lastAttempt.appId);
  }

  async function requestAccess(level: AccessLevel): Promise<void> {
    if (route.kind !== "space" || route.area.kind !== "app") return;
    const { hid } = route;
    const { appId } = route.area;
    try {
      await bff.request("/identity/grant-requests", {
        method: "POST",
        body: { hid, appId, requestedLevel: level },
      });
      setRequestedAccess((keys) => [...keys, `${hid}/${appId}`]);
    } catch (error) {
      observability.reportError({
        appId,
        remoteVersion: null,
        source: "access-request",
        message: errorMessage(error),
      });
    }
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
        <SpaceSwitcherStub name={household?.name ?? ""} />
        <AppDock
          apps={apps}
          activeAppId={activeAppId}
          hidSegment={hidSegment}
          onSelect={selectApp}
        />
        <div className={styles.account}>
          <span>{user.name}</span>
          <button type="button" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </div>
      <AppSlotStatus
        status={slotStatus}
        onRetry={retry}
        onRequestAccess={(level) => void requestAccess(level)}
      />
      <div className={styles.slot} ref={slotRef} />
      <DevOverlay observability={observability} />
    </div>
  );
}
