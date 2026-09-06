# AppModule contract and lifecycle

## The contract

`packages/contracts/src/lifecycle.ts`:

```ts
export interface AppModule {
  mount(el: HTMLElement, sdk: HostSDK): void | Promise<void>;
  unmount(el: HTMLElement): void | Promise<void>;
}
```

That's the whole contract — `mount` and `unmount`, nothing else. There is no
`bootstrap`, `update`, `prefetch`, or `destroy` hook. If you've seen those
names mentioned elsewhere (older docs, a comment), they don't exist in the
current contract.

Your app's default export (or whatever the manifest's `mount.exposed` module
resolves to) must satisfy this interface. `mount` receives:

- `el` — the element your app renders into. Attach your framework's root
  here (`createRoot(el)`, `createApp(...).mount(el)`, etc.).
- `sdk` — the `HostSDK` for this mount. See [sdk-reference.md](./sdk-reference.md).

`unmount` receives the same `el` and must tear down everything `mount` set
up: unmount the framework root, unsubscribe from `sdk.router`, remove any
global listeners.

`packages/lifecycle/src/index.ts` provides a small helper if you only want
to implement one of the two methods:

```ts
import { createLifecycle } from "@hostyara/lifecycle";

export default createLifecycle({
  mount(el, sdk) {
    /* ... */
  },
  unmount(el) {
    /* ... */
  },
});
```

## Why mount/unmount must be idempotent

The host may mount and unmount your app repeatedly without a page reload:
navigating away and back, a household switch, React StrictMode's
double-invoke in dev. If `mount`/`unmount` leak a subscription, a listener,
or a DOM mutation each cycle, the leak compounds every time a user
navigates — this bit the host itself twice (see the router-adapter bugs
fixed under T13 and T20) before the conformance suite existed to catch it.

Concretely, idempotent means:

- Mount → unmount must leave **zero** live subscriptions to `sdk.router`.
- Mounting again after that must re-subscribe the same number of listeners
  as the first mount did — not more.
- Calling `unmount` a second time (already unmounted) must not throw.

## The conformance suite

`@hostyara/conformance`'s `runConformanceSuite` runs your `AppModule`
against a fake `HostSDK` and asserts the rules below. Every app must call
it from its own Jest test:

```ts
// src/__jest__/conformance.test.ts
import { runConformanceSuite } from "@hostyara/conformance";

runConformanceSuite({
  appId: "recipes",
  loadAppModule: () => import("../index").then((m) => m.default),
  // Optional: an app-specific assertion that your UI actually reacted to
  // a location push the host initiated (not one your app itself caused).
  expectReactedToLocationChange: (el) => {
    expect(el.textContent).not.toContain("Рецепты");
  },
});
```

What it checks:

1. **Mount/unmount idempotency** — described above.
2. **`document.head` untouched** — `document.head.innerHTML` must be
   byte-identical before mount, after mount, and after unmount. Your styles
   belong in the shadow root the host gives you (via `manifest.mount.styles`
   or your own CSS-in-JS target), not the document head.
3. **No direct `window.history`/`window.location` access** — pushState,
   replaceState, and `location.href` must be unchanged across a full
   mount → unmount cycle. Use `sdk.router` instead — see
   [routing.md](./routing.md) for why the host, not your app, owns history.
4. **Storage keys are prefixed** — every `localStorage`/`sessionStorage`
   key you write during mount/unmount must start with `` `${appId}:` ``
   (colon separator).
5. **Custom element names are prefixed** — every name passed to
   `customElements.define` must start with `` `${appId}-` `` (dash
   separator — different from the storage convention, don't mix them up).
6. **Reacts to an externally-driven location change** — the host can push
   a new location into your mounted app (e.g. a deep link, a dock click)
   without remounting it; your app must re-render off the new location
   rather than only responding to navigations it initiated itself.
7. **Survives a context change without unmounting** — switching household
   (`hid`) while your app is mounted must not throw; `sdk.context` must
   reflect the new value on the next read.

Two things the suite deliberately does **not** check, because jsdom can't
observe them: an actual full-page reload (`window.location.reload` isn't
spyable), and any rule about service workers or generic global-variable
pollution — no such check exists in this codebase today. If you need that
guarantee, verify it manually or in the host's own Playwright e2e suite.

## The dev-harness mirrors the real mount shape

`@hostyara/dev-harness`'s `runDevHarness` creates the exact same DOM shape
the real host's mount manager does — a `div[data-app]` with an open shadow
root and an inner container — specifically so your app can't tell the
difference between the dev-harness and the real host from its DOM structure
alone. See [quickstart.md](./quickstart.md) for how to wire it up.
