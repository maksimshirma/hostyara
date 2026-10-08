# HostSDK reference

The second argument to `AppModule.mount`. Everything your app is allowed to
do that touches the shell — routing, navigation chrome, sharing — goes
through this object rather than global browser APIs.

```ts
export interface HostSDK {
  readonly mode: "household" | "public";
  readonly basename: string;
  readonly context: SdkContext;
  router: SdkRouter;
  nav: SdkNav;
  apps: SdkApps;
  share: SdkShare;
  api: SdkApi;
  access: SdkAccess;
}
```

`@hostyara/sdk` re-exports these same types for convenience — it's a type
barrel, not a separate SDK surface. Import from either package; they're the
same types.

## `mode` and `context`

```ts
export type SdkContext =
  | { mode: "household"; hid: string; user: User; permissions: string[] }
  | { mode: "public"; type: string; id: string };
```

`context` is read fresh on every access — the host doesn't remount your app
when the household (`hid`) changes; it just updates what `sdk.context`
returns on the next read. If your app caches `sdk.context` at mount time
instead of reading it live, it will miss household switches. Re-read it, or
subscribe via `sdk.router.subscribe` (household switches ride the same
notification channel as location changes — there's no separate
"context changed" event).

`context.permissions` is deprecated: it is a snapshot taken at mount. Use
`sdk.access.can()` (below), which stays current when rights change.

## `basename`

The path prefix your app is mounted under, e.g. `/h/abc123/a/recipes`. Also
re-derived live, for the same reason as `context`. You shouldn't need to
read this directly in most apps — `sdk.router.location` and
`sdk.router.navigate` already work relative to it.

## `router`

```ts
export interface SdkRouter {
  location: Location;
  navigate(to: string, opts?: { replace?: boolean }): void;
  back(): void;
  subscribe(cb: (loc: Location) => void): () => void;
  link(to: string): string;
}

export interface Location {
  pathname: string;
  search: string;
  hash: string;
}
```

- `location` and `navigate` are **relative to your own basename** — inside
  your app, `/` means your app's own root, not the host's root.
- `link(to)` returns an **absolute** path (including your basename) —
  use it when you need a full URL for an `<a href>` outside your router's
  own Link component, e.g. for `sdk.share`.
- `subscribe` fires on every location change, including ones your app
  didn't cause (deep links, dock clicks, household switches). Always
  unsubscribe in `unmount` — see [app-module.md](./app-module.md)'s
  idempotency rules.
- Once the current address no longer belongs to your app (Back/Forward
  into another app, a shell page) your app is about to be unmounted, and
  `navigate` is ignored — a framework router reacting to the foreign
  location can't rewrite where the person just went.
- There is no `dispose`/`destroy` on the router adapter — the unsubscribe
  function `subscribe` returns is the only cleanup you need.

If you're using React Router or Vue Router, use `@hostyara/router-react`'s
`createReactRouterHistory` or `@hostyara/router-vue`'s
`createVueRouterHistory` instead of calling `sdk.router` directly — they
adapt `sdk.router` to each framework's native history interface, including
correctly tying the `sdk.router` unsubscribe to the framework's own
last-listener-removed signal.

## `nav`

```ts
export interface SdkNav {
  setBreadcrumbs(trail: Crumb[]): void;
  setTitle(title: string): void;
}

export interface Crumb {
  label: string;
  href?: string;
}
```

Lets your app contribute to the host's chrome (breadcrumb trail, page
title) instead of rendering its own (IA §8).

- The shell draws the first links itself — the household and your app's
  name (linking to your app's root). `setBreadcrumbs` gives **only the tail
  after them**, e.g. `[{ label: "Паста карбонара" }]` on a recipe screen;
  `[]` on your root.
- `href` is a path **inside your app** (`"/collections/7"`), resolved
  against your basename like `navigate`. Anything that doesn't start with a
  single `/` is shown as plain text, never as a link. The last crumb is
  always plain text.
- `setTitle` sets the page title (`document.title` becomes
  `<title> — Хостяра`); without it the last crumb is used.
- Republish on every screen change — the host clears your trail and title
  when your app is mounted or unloaded, and ignores calls from an app that
  is no longer the one open.

## `apps`

```ts
export interface SdkApps {
  open(appId: string, to: string): void;
  canOpen(appId: string): boolean;
}
```

For cross-app navigation initiated by one app into another (e.g. a
"View recipe" link from the budget app). Also currently wired to no-ops in
the real host (`open: () => {}`, `canOpen: () => false`) — present in the
contract, not yet functional.

## `share`

```ts
export interface SdkShare {
  create(type: string, id: string): Promise<{ url: string; expiresAt: string }>;
  list(type: string, id: string): Promise<Publication[]>;
  revoke(token: string): Promise<void>;
}
```

For creating shareable links to entities your app owns. Also currently
stubbed in the real host (returns empty results, never throws) — the shape
is stable to build against, the behavior isn't implemented yet.

## `api`

```ts
export interface SdkApi {
  request<T = unknown>(service: string, path: string, init?: SdkApiRequestInit): Promise<T>;
}

export interface SdkApiRequestInit {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown; // sent as JSON
}
```

The only way your app reaches its own backend. Never call `fetch` against a
backend directly: the host sends the request through the platform's BFF
with the user's session, and your backend receives a short-lived token
scoped to your app. Your app never sees a token or a cookie.

- `service` must be your own app id; any other value is rejected.
- `path` is relative to your backend's base URL (`"/items/42"`).
- Resolves with the parsed JSON body (text for non-JSON responses,
  `undefined` for 204).
- Rejects with an `SdkApiError` — a plain object, check it with
  `isSdkApiError(e)`:

```ts
import { isSdkApiError } from "@hostyara/sdk";

try {
  const items = await sdk.api.request<Item[]>("recipes", "/items", { query: { q: "soup" } });
} catch (e) {
  if (isSdkApiError(e) && e.code === "http_error" && e.status === 404) {
    // your backend's own 404; its body is in e.body
  }
}
```

| `code`                                                      | Meaning                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| `http_error`                                                | your backend answered non-2xx (`status`, `body` are its own) |
| `no_grant`, `not_installed`, `forbidden`                    | the user lost access; the shell shows the matching screen    |
| `unauthenticated`                                           | the session ended; the shell shows the login screen          |
| `bad_request`, `payload_too_large`                          | refused by the platform before reaching your backend         |
| `upstream_unavailable`, `upstream_timeout`, `network_error` | your backend or the platform is unreachable                  |

## `access`

```ts
export interface SdkAccess {
  readonly level: "view" | "edit";
  can(action: "edit" | Permission): boolean;
  subscribe(callback: () => void): () => void;
  requestAccess(level: "view" | "edit"): Promise<void>;
}
```

The user's access to your app in the current household. `level` is always
`"view"` in public mode. `can("edit")` checks the grant level; any other
string checks one of your app's confirmed manifest permissions. Read these
when you render instead of caching them, and re-render from `subscribe` —
rights can change while your app is open (a grant revoked, a role changed),
and the host learns about it immediately. `requestAccess` opens the shell's
own "request access" dialog.

This only drives your UI: your backend still enforces `view` vs `edit` from
the token's `scope`.

## What's not part of `HostSDK`

A few things you might expect aren't here, on purpose:

- **No `styleRoot`/shadow-root access.** The dev-harness's `DevHarnessSdk`
  adds a non-contract `ui.styleRoot` field for CSS-in-JS libraries that need
  an explicit mount point — that's a dev-only convenience, not part of the
  real contract. In the real host, your styles come from
  `manifest.mount.styles` (see [manifest.md](./manifest.md)), and the
  mount manager injects them into your shadow root for you.
- **No `getToken()`.** Tokens never reach app code (MF or iframe); use `api`.
- **No `auth`, `notifications`, `featureFlags`, or `permissions` sub-object.**
  These types exist standalone in `@hostyara/contracts`
  (`auth.ts`, `notifications.ts`, `feature-flags.ts`, `permissions.ts`) but
  are not fields on `HostSDK` and aren't wired into the real host yet. Don't
  build against `sdk.auth` or similar — it doesn't exist.

## Building against a fake SDK in tests

`@hostyara/conformance`'s `createConformanceSdk(appId)` and
`@hostyara/dev-harness`'s `createDevHarnessSdk(shadowRoot, options)` are the
two reference implementations of `HostSDK` outside the real host. Both
mirror the real `buildSdk` in `apps/host/src/chrome/HostChrome.tsx` — read
that function if you want to see exactly how `basename`/`context` are
derived from the host's router state in production.
