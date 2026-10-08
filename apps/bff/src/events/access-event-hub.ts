// identity-service's access.changed payload (access.md, «Мгновенное обновление»).
export interface AccessChangedEvent {
  hid: string;
  userId?: string;
  appId?: string;
}

export interface Subscription {
  userId: string;
  hid: string;
}

type Listener = (event: AccessChangedEvent) => void;

// In-memory fan-out from the access.changed webhook to open SSE connections.
// A connection watches one household for one user: an event without userId
// reaches every member watching that household, one with userId only that
// member's connections.
export function createAccessEventHub() {
  const listeners = new Map<Listener, Subscription>();

  return {
    subscribe(subscription: Subscription, listener: Listener): () => void {
      listeners.set(listener, subscription);
      return () => {
        listeners.delete(listener);
      };
    },

    publish(event: AccessChangedEvent): number {
      let delivered = 0;
      for (const [listener, subscription] of listeners) {
        if (
          subscription.hid === event.hid &&
          (!event.userId || subscription.userId === event.userId)
        ) {
          listener(event);
          delivered += 1;
        }
      }
      return delivered;
    },

    get connectionCount(): number {
      return listeners.size;
    },
  };
}

export type AccessEventHub = ReturnType<typeof createAccessEventHub>;
