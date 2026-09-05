import { AppManifest, AppModule, HostSDK } from "@hostyara/contracts";

export interface MountManager {
  mount(
    slot: HTMLElement,
    manifest: AppManifest,
    appModule: AppModule,
    sdk: HostSDK,
  ): Promise<void>;
  unmount(slot: HTMLElement): Promise<void>;
}

interface SlotState {
  host: HTMLElement;
  el: HTMLElement;
  appModule: AppModule;
}

export function createMountManager(tokensHref: string): MountManager {
  const styleTextCache = new Map<string, Promise<string>>();
  const mountedSlots = new WeakMap<HTMLElement, SlotState>();

  function getStylesheetText(href: string): Promise<string> {
    let cached = styleTextCache.get(href);
    if (!cached) {
      cached = fetch(href).then((response) => response.text());
      styleTextCache.set(href, cached);
    }
    return cached;
  }

  async function applyStyles(root: ShadowRoot, hrefs: string[]): Promise<void> {
    const texts = await Promise.all(hrefs.map(getStylesheetText));
    for (const text of texts) {
      const style = document.createElement("style");
      style.textContent = text;
      root.append(style);
    }
  }

  return {
    async mount(slot, manifest, appModule, sdk) {
      const host = document.createElement("div");
      host.dataset.app = manifest.id;
      const root = host.attachShadow({ mode: "open" });

      await applyStyles(root, [tokensHref, ...manifest.mount.styles]);

      const el = document.createElement("div");
      root.append(el);
      slot.append(host);

      await appModule.mount(el, sdk);

      mountedSlots.set(slot, { host, el, appModule });
    },

    async unmount(slot) {
      const state = mountedSlots.get(slot);
      if (!state) return;

      await state.appModule.unmount(state.el);
      state.host.remove();
      mountedSlots.delete(slot);
    },
  };
}
