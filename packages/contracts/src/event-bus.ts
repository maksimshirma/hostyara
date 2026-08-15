export interface EventMap {
  [event: string]: unknown;
}

export interface EventBus<Events extends EventMap = EventMap> {
  emit<K extends keyof Events>(event: K, payload: Events[K]): void;
  on<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): () => void;
  off<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): void;
}
