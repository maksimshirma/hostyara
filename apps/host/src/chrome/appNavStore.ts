import { Crumb } from "@hostyara/contracts";

export interface AppNavState {
  // Приложение, которому сейчас разрешено публиковать крошки и заголовок.
  appId: string | null;
  trail: Crumb[];
  title: string | null;
}

export interface AppNavStore {
  getSnapshot(): AppNavState;
  subscribe(listener: () => void): () => void;
  // Перед монтированием приложения: прежняя цепочка сбрасывается.
  activate(appId: string): void;
  deactivate(): void;
  setBreadcrumbs(appId: string, trail: Crumb[]): void;
  setTitle(appId: string, title: string): void;
}

const EMPTY: AppNavState = { appId: null, trail: [], title: null };

// IA §8: shell рисует крошки, приложение публикует их хвост через
// sdk.nav. Вызов от приложения, которое уже не смонтировано (выгружается,
// ушли Back'ом), игнорируется — иначе оно перепишет чужую цепочку.
export function createAppNavStore(): AppNavStore {
  let state = EMPTY;
  const listeners = new Set<() => void>();

  function update(next: AppNavState): void {
    state = next;
    for (const listener of listeners) listener();
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    activate(appId) {
      update({ appId, trail: [], title: null });
    },
    deactivate() {
      if (state !== EMPTY) update(EMPTY);
    },
    setBreadcrumbs(appId, trail) {
      if (appId !== state.appId) return;
      update({ ...state, trail: trail.map(({ label, href }) => ({ label, href })) });
    },
    setTitle(appId, title) {
      if (appId !== state.appId) return;
      update({ ...state, title });
    },
  };
}
