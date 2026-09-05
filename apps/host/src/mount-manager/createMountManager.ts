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

const STYLE_SELECTOR = "style,link[rel='stylesheet']";

/**
 * Some remote bundlers' own runtime inserts CSS into document.head even
 * when the extraction config asks it not to (see T6). Rather than trust
 * every remote's build to behave, the mount manager watches document.head
 * for the duration of mount() and relocates anything a remote sneaks in
 * there into its own shadow root, where it belongs.
 */
async function withHeadStylesRelocatedTo(
  root: ShadowRoot,
  run: () => void | Promise<void>,
): Promise<void> {
  const strayNodes: Element[] = [];
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element && node.matches(STYLE_SELECTOR)) {
          strayNodes.push(node);
        }
      }
    }
  });

  observer.observe(document.head, { childList: true });
  try {
    await run();
  } finally {
    observer.disconnect();
    for (const node of strayNodes) {
      node.remove();
      root.append(node);
    }
  }
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

      await withHeadStylesRelocatedTo(root, () => appModule.mount(el, sdk));

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
