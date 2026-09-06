# URL scheme and history

## URL shape

```
/h/:hidSegment/a/:appId/*
```

Everything up to and including `a/:appId` belongs to the shell; everything
after belongs to your app. Parsed by `apps/host/src/router/route.ts`:

```ts
export type SpaceArea =
  | { kind: "app"; appId: string; appPath: string; basename: string }
  | { kind: "catalog" | "inbox" | "search" | "settings" }
  | { kind: "home" };

export type Route =
  { kind: "space"; hid: string; hidSegment: string; area: SpaceArea } | { kind: "not-found" };
```

`hidSegment` is not the raw household id — it's the id optionally followed
by a slugified household name (`hid-slugified-name`), canonicalized by
`canonicalizeHidSegment`. `resolveHid` strips everything from the first
hyphen onward to recover the real `hid`. An old bare-hid link
(`/h/abc123/...`) keeps working: the router redirects it to the canonical
slugged form via `replaceState` (not `pushState`, so it doesn't add an
extra history entry) rather than 404ing.

`a`, `catalog`, `inbox`, `search`, and `settings` are reserved first-level
segments inside a household space — your `appId` can never collide with
one of these, because an app's routes always appear after the literal `a/`
segment.

## Why apps never touch `window.history`

The host owns `window.history` for the whole page, across every mounted
app, so it can also own things that only make sense at that level: scroll
position per history entry (`apps/host/src/router/scrollRestoration.ts`),
canonical-URL redirects, and coordinating which app is even mounted for a
given path. If your app called `pushState` directly, the host's own router
wouldn't know a navigation happened. Use `sdk.router` — see
[sdk-reference.md](./sdk-reference.md) — and see
[shared-realm.md](./shared-realm.md) for how direct access is discouraged
in dev and checked in the conformance suite.

## `HostRouter`

```ts
export interface HostRouter {
  getLocation(): HostRouterLocation;
  getRoute(): Route;
  navigate(to: string, opts?: { replace?: boolean }): void;
  subscribe(callback: () => void): () => void;
  attach(): () => void;
}
```

`attach()` is separate from construction on purpose: it registers the
`popstate` listener and returns a detach function, so a single React effect
can pair setup and teardown symmetrically. Splitting the two like this
fixed a real bug (T13) — a prior `dispose()`-only design meant React
StrictMode's mount → cleanup → mount cycle in development called the real
teardown with no matching re-setup, permanently dropping the listener after
the first render.

`navigate` saves the current scroll position, writes via
`pushState`/`replaceState`, attaches a scroll-restoration key to the
history entry's `state`, redirects to the canonical hid-slug form if
needed, then notifies subscribers.

## From host coordinates to app coordinates

`createSdkRouter` adapts the host's absolute `HostRouter` into the
per-app, basename-relative `SdkRouter` your app actually receives:

```ts
export function getLiveBasename(hostRouter: HostRouter, appId: string): string {
  const route = hostRouter.getRoute();
  if (route.kind === "space" && route.area.kind === "app" && route.area.appId === appId) {
    return route.area.basename;
  }
  return `/a/${appId}`;
}
```

Basename is recomputed on every access, not captured once at mount — this
is what lets a household switch update `sdk.basename`/`sdk.router.location`
for an already-mounted app without remounting it. Inside your app,
`sdk.router.location` and `sdk.router.navigate` are always relative to your
own basename; `sdk.router.link(to)` always returns an absolute path,
useful when you need a full URL outside your own router (e.g. for
`sdk.share`).

If you use React Router or Vue Router, adapt through
`@hostyara/router-react`'s `createReactRouterHistory` or
`@hostyara/router-vue`'s `createVueRouterHistory` rather than calling
`sdk.router` yourself — see [sdk-reference.md](./sdk-reference.md).

## Scroll restoration

The host disables the browser's native scroll restoration
(`window.history.scrollRestoration = "manual"`) and manages it itself,
keyed per history entry via a key stored in that entry's `history.state`
(`hostyaraScrollKey`). Restoration is deferred one macrotask on `popstate`,
because the mounted app for that entry may change asynchronously. Apps
never see or manage this — it's entirely host-side, which is also why apps
can't do it themselves even if they wanted to (they don't own
`window.history`).
