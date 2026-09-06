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
title) instead of rendering its own. In the current host implementation
both are no-ops (`HostChrome.tsx`'s `buildSdk` wires them to `() => {}`) —
the interface exists and is safe to call, but nothing visible happens yet.

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

## What's not part of `HostSDK`

A few things you might expect aren't here, on purpose:

- **No `styleRoot`/shadow-root access.** The dev-harness's `DevHarnessSdk`
  adds a non-contract `ui.styleRoot` field for CSS-in-JS libraries that need
  an explicit mount point — that's a dev-only convenience, not part of the
  real contract. In the real host, your styles come from
  `manifest.mount.styles` (see [manifest.md](./manifest.md)), and the
  mount manager injects them into your shadow root for you.
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
