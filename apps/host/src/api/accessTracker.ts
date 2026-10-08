import { isSdkApiError } from "@hostyara/contracts";
import { BffClient } from "./bffClient";

export interface AccessSnapshot {
  role: string;
  installedApps: string[];
  grants: Record<string, "view" | "edit">;
  permissions: Record<string, string[]>;
}

export type AccessStatus = "idle" | "loading" | "ready" | "forbidden" | "error";

// Only what this module uses of EventSource, so tests can pass a fake.
export interface AccessEventSource {
  readonly readyState: number;
  addEventListener(type: string, listener: () => void): void;
  close(): void;
  onerror: ((event: Event) => void) | null;
}

export interface AccessTrackerOptions {
  bff: BffClient;
  // The BFF's SSE stream said the session is gone.
  onSessionEnded(): void;
  createEventSource?: (url: string) => AccessEventSource;
  reconnectDelayMs?: number;
}

const EVENT_SOURCE_CLOSED = 2;

// The current user's access in the household open in the shell, kept live:
// loaded from /api/h/:hid/access and re-loaded whenever the BFF's SSE stream
// reports access.changed (or after the stream reconnects, in case an event
// was missed). One tracker per tab; setHid() follows household switches.
export function createAccessTracker(options: AccessTrackerOptions) {
  const createEventSource = options.createEventSource ?? ((url: string) => new EventSource(url));
  const reconnectDelayMs = options.reconnectDelayMs ?? 5000;
  const listeners = new Set<() => void>();

  let hid: string | null = null;
  let snapshot: AccessSnapshot | null = null;
  let status: AccessStatus = "idle";
  let generation = 0;
  let source: AccessEventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function notify() {
    for (const listener of listeners) listener();
  }

  async function load(forGeneration: number) {
    const target = hid;
    if (!target) return;
    if (!snapshot) {
      status = "loading";
      notify();
    }
    try {
      const next = await options.bff.request<AccessSnapshot>(
        `/api/h/${encodeURIComponent(target)}/access`,
      );
      if (forGeneration !== generation) return;
      snapshot = next;
      status = "ready";
    } catch (error) {
      if (forGeneration !== generation) return;
      snapshot = null;
      status = isSdkApiError(error) && error.code === "forbidden" ? "forbidden" : "error";
    }
    notify();
  }

  function disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    source?.close();
    source = null;
  }

  function connect(forGeneration: number) {
    const target = hid;
    if (!target) return;
    const current = createEventSource(`/api/h/${encodeURIComponent(target)}/events`);
    source = current;
    let readyCount = 0;
    current.addEventListener("ready", () => {
      // The browser reconnected on its own after a drop: events may have
      // been missed in between.
      if (++readyCount > 1) void load(forGeneration);
    });
    current.addEventListener("access.changed", () => void load(forGeneration));
    current.addEventListener("session.ended", () => {
      disconnect();
      options.onSessionEnded();
    });
    current.onerror = () => {
      // A non-2xx answer (or a closed stream) makes EventSource give up for
      // good; transient drops are retried by the browser itself.
      if (current.readyState !== EVENT_SOURCE_CLOSED || forGeneration !== generation) return;
      current.close();
      reconnectTimer = setTimeout(() => {
        if (forGeneration !== generation) return;
        void load(forGeneration);
        connect(forGeneration);
      }, reconnectDelayMs);
    };
  }

  return {
    setHid(next: string | null): void {
      if (next === hid) return;
      disconnect();
      hid = next;
      snapshot = null;
      status = "idle";
      const current = ++generation;
      notify();
      if (next) {
        void load(current);
        connect(current);
      }
    },
    getHid: () => hid,
    getSnapshot: () => snapshot,
    getStatus: () => status,
    refresh(): Promise<void> {
      return load(generation);
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    // Stops loading and streaming; subscribers stay registered, so a later
    // setHid() (e.g. StrictMode's effect re-run) resumes notifying them.
    close(): void {
      generation++;
      disconnect();
      hid = null;
    },
  };
}

export type AccessTracker = ReturnType<typeof createAccessTracker>;
