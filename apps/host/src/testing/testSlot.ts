// jsdom (and real browsers) only wire up certain behaviors — an iframe's
// contentWindow, focus, layout — once an element is connected to the live
// document. A bare document.createElement("div") used as a mount-manager
// slot silently doesn't behave like the real one in HostChrome.
export function createAttachedTestSlot(): HTMLDivElement {
  const el = document.createElement("div");
  document.body.append(el);
  return el;
}

export function removeTestSlot(el: HTMLElement): void {
  el.remove();
}

// The mount manager (and createIframeAppModule) render into a host element
// tagged data-app=appId with an open shadow root — this is the one place
// tests need to reach into it instead of asserting on the slot directly.
export function getMountedShadowRoot(slot: HTMLElement, appId: string): ShadowRoot | null {
  return slot.querySelector<HTMLElement>(`[data-app="${appId}"]`)?.shadowRoot ?? null;
}
