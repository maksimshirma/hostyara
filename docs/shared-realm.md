# Shared-realm rules

Every remote runs in the same browser realm as the host and every other
app (Module Federation loads your code into the same JS context; even the
iframe transport shares the same top-level browser session). Nothing
technically stops your app from calling `window.history.pushState` or
`localStorage.setItem("token", ...)` — these rules exist because the
platform can't fully sandbox you, and are enforced where the codebase
actually enforces them, not by ambient convention.

## `window.history` and `window.location`

**Rule:** never call these directly. Use `sdk.router` instead — the host
owns navigation and scroll restoration across your app and every other app
(see [routing.md](./routing.md)).

**Enforcement:**

- The conformance suite's `checkNoDirectHistoryOrLocationAccess` spies on
  `pushState`/`replaceState` and compares `location.href` before and after
  a full mount → unmount cycle; neither may change.
- In dev only (`apps/host/src/router/historyGuard.ts`,
  `installDevHistoryGuard`), the host monkey-patches
  `history.pushState`/`replaceState`/`location.assign`/`location.replace`
  to `console.warn` with the currently-mounted app's id whenever one is
  called directly — a live, in-browser nudge while you're developing, not
  just a test-time check. It's a no-op in production
  (`process.env.NODE_ENV === "production"` short-circuits it) and never
  changes behavior, only warns.
- `location.href = ...` (the setter) isn't interceptable this way in any
  current browser — it isn't guarded. Don't rely on the absence of a
  warning there as proof you're compliant.

## Storage keys

**Rule:** every `localStorage`/`sessionStorage` key you write must be
prefixed `` `${appId}:` `` (colon separator).

**Enforcement:** conformance's `checkStorageKeysPrefixed` spies on
`Storage.prototype.setItem` during your mount/unmount cycle and asserts
every key written starts with your `appId` and a colon. Unprefixed keys
risk colliding with another app's or the host's own storage.

## Custom element names

**Rule:** every name you pass to `customElements.define` must be prefixed
`` `${appId}-` `` (dash separator — note this differs from the storage
convention's colon; don't mix them up).

**Enforcement:** conformance's `checkCustomElementNamesPrefixed`. Custom
element registration is global and can only happen once per name per page
— an unprefixed name from one app can permanently block another app (or a
future version of your own app) from ever registering that name again.

## `document.head`

**Rule:** don't inject `<style>`, `<link>`, or anything else into
`document.head`. Your styles belong in the shadow root the host mounts you
into.

**Enforcement:** conformance's `checkDocumentHeadUntouched` asserts
`document.head.innerHTML` is byte-identical before mount, after mount, and
after unmount. As a safety net (not a compliance mechanism — see
[remote-build.md](./remote-build.md)), the host's mount manager and remote
loader both actively relocate or discard stray head-injected style nodes a
bundler runtime might add despite your own CSS extraction config.

## What isn't enforced (yet)

Be aware of the gap rather than assuming coverage:

- **Service workers.** No check, lint rule, or runtime guard against a
  remote registering a service worker exists anywhere in this codebase.
  Registering one from a remote is almost certainly a bad idea (a service
  worker's scope isn't isolated per-app), but nothing currently stops it.
- **Generic global-variable pollution.** There's no check for `window.foo =
...`-style assignments beyond the specific `history`/`location` guard
  above. Avoid writing to `window` directly regardless.

## Isolation mechanism, in one sentence

Isolation here is achieved through an **open shadow root** per app (created
by the host's mount manager, and mirrored exactly by the dev-harness for
local development) plus the specific runtime/test-time checks above — not
through a general sandbox, iframe (unless you opt into the iframe
transport), or Content-Security-Policy restriction on your own code's
behavior within the realm. Iframe-transport apps (`mount.type: "iframe"`)
get real process/DOM isolation from the browser itself; Module
Federation apps get shadow-DOM isolation plus these specific checks.
