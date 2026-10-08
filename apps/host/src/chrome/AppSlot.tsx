import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Box from "@mui/material/Box";
import { AccessLevel } from "@hostyara/contracts";
import { RemoteLoadError } from "../remote-loader";
import { useRouter } from "@tanstack/react-router";
import { useRoute } from "../router";
import { AppAccessDecision, decideAppAccess } from "./appAccess";
import { AppSlotStatus } from "./AppSlotStatus";
import { buildSdk } from "./buildSdk";
import { appNameOf, useShellServices } from "./ShellServices";
import { SlotErrorReason, SlotStatus } from "./slotStatus";

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

const DENIED_REASONS: Record<Exclude<AppAccessDecision, "allow" | "pending">, SlotErrorReason> = {
  "not-installed": { kind: "not-installed" },
  "no-grant": { kind: "no-access", requested: false },
  "not-member": { kind: "not-member" },
  unavailable: { kind: "access-unavailable" },
};

// The component of the app mount route (/h/$hid/a/$appId/$). It stays
// mounted while the person moves between apps — the route doesn't change,
// only its params — and unmounts, unloading the app, once they leave the
// app area for a shell page.
export function AppSlot() {
  const {
    bff,
    accessTracker,
    user,
    registry,
    remoteLoader,
    mountManager,
    observability,
    appNav,
    attempt,
  } = useShellServices();
  const { history } = useRouter();
  const route = useRoute();
  const slotRef = useRef<HTMLDivElement>(null);
  const openGenerationRef = useRef(0);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [slotStatus, setSlotStatus] = useState<SlotStatus>({ kind: "idle" });
  const [lastAttemptAppId, setLastAttemptAppId] = useState<string | null>(null);
  // "hid/appId" pairs this tab already sent an access request for.
  const [requestedAccess, setRequestedAccess] = useState<string[]>([]);
  const accessStatus = useSyncExternalStore(accessTracker.subscribe, accessTracker.getStatus);
  const accessSnapshot = useSyncExternalStore(accessTracker.subscribe, accessTracker.getSnapshot);
  const activeAppIdRef = useRef(activeAppId);
  activeAppIdRef.current = activeAppId;

  // A route change (dock click, popstate, or the deep-link effect below
  // firing twice under StrictMode) can call openApp again before a prior
  // call finishes. The generation counter lets a superseded call detect
  // that and back out instead of racing another mount into the same slot.
  async function openApp(appId: string) {
    const generation = ++openGenerationRef.current;
    attempt.appId = appId;
    attempt.version = null;
    setLastAttemptAppId(appId);

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

    attempt.version = resolved.manifest.version;
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

      const slot = slotRef.current;
      if (slot) {
        await mountManager.unmount(slot);
        if (generation !== openGenerationRef.current) return;
        const mountStart = performance.now();
        // Before mount: the app may publish its breadcrumbs from mount().
        appNav.activate(appId);
        await mountManager.mount(
          slot,
          resolved.manifest,
          appModule,
          buildSdk(appId, history, { bff, accessTracker, user, appNav }),
        );
        observability.reportMetric({
          kind: "mount",
          appId,
          durationMs: performance.now() - mountStart,
        });
        if (generation !== openGenerationRef.current) {
          await mountManager.unmount(slot);
          return;
        }
        // Fire-and-forget: an approximate "did it actually paint" signal,
        // not something the mount flow itself should wait on.
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

  // IA 13.7: without access the app is not mounted — or is unmounted if
  // access went away while it was open — and the shell shows why. The URL
  // stays, so the app comes back by itself once access is granted.
  async function showDenied(appId: string, reason: SlotErrorReason) {
    ++openGenerationRef.current;
    appNav.deactivate();
    setSlotStatus({ kind: "error", appName: appNameOf(registry, appId), reason });
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
  // mount → navigate → remount loop. Only re-open when the target app
  // actually differs from what's already mounted.
  useEffect(() => {
    if (route.kind !== "space" || route.area.kind !== "app") return;
    const appId = route.area.appId;
    const decision = decideAppAccess(accessStatus, accessSnapshot, appId);
    if (decision === "pending") {
      if (appId !== activeAppId) {
        setSlotStatus({ kind: "loading", appName: appNameOf(registry, appId) });
      }
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

  // Leaving the app area unloads the app and cancels a load still in flight.
  useEffect(() => {
    const slot = slotRef.current;
    return () => {
      // A counter, not a DOM node: bumping its live value is what cancels
      // an open still in flight.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ++openGenerationRef.current;
      appNav.deactivate();
      attempt.appId = null;
      if (slot) void mountManager.unmount(slot);
    };
  }, [appNav, attempt, mountManager]);

  function retry(): void {
    if (slotStatus.kind === "error" && slotStatus.reason.kind === "access-unavailable") {
      void accessTracker.refresh();
      return;
    }
    if (lastAttemptAppId) void openApp(lastAttemptAppId);
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

  return (
    <>
      <AppSlotStatus
        status={slotStatus}
        onRetry={retry}
        onRequestAccess={(level) => void requestAccess(level)}
      />
      {/* The mount manager keeps the app's shadow root inside this element. */}
      <Box ref={slotRef} />
    </>
  );
}
