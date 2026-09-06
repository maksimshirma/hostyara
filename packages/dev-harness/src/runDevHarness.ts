import { AppModule } from "@hostyara/contracts";
import { createDevHarnessSdk, DevHarnessOptions } from "./createDevHarnessSdk";

// tech.md: "запускает приложение standalone с фейковым shell — своим
// context, токеном и уже созданным shadow root. Без него разработка
// требует поднятого shell целиком, и авторы начнут обходить SDK." Mirrors
// the real mount-manager's own shape (host element tagged data-app, open
// shadow root, inner container) so an app can't tell the difference
// between this and the real host from its DOM structure alone.
export async function runDevHarness(
  appModule: AppModule,
  options: DevHarnessOptions,
): Promise<() => Promise<void>> {
  // The harness is served as its own static file (e.g. standalone.html),
  // and that filename would otherwise become the app's own starting
  // pathname — an app never sees its own bootstrap file's path once
  // actually hosted, so this normalizes to "/" (or an explicit
  // startPath) the same way, preserving only search/hash for convenience.
  const startPath = options.startPath ?? "/";
  window.history.replaceState(
    null,
    "",
    `${startPath}${window.location.search}${window.location.hash}`,
  );

  const host = document.createElement("div");
  host.dataset.app = options.appId;
  document.body.append(host);

  const shadowRoot = host.attachShadow({ mode: "open" });
  const el = document.createElement("div");
  shadowRoot.append(el);

  const sdk = createDevHarnessSdk(shadowRoot, options);
  await appModule.mount(el, sdk);

  return async () => {
    await appModule.unmount(el);
    host.remove();
  };
}
