# URL scheme and history

## URL shape

```
/h/:hidSegment/a/:appId/*
```

Everything up to and including `a/:appId` belongs to the shell; everything
after belongs to your app. The shell's whole route table (IA §4) is parsed
by `parseRoute` in `apps/host/src/router/route.ts`:

| Path                                    | `Route`                                               |
| --------------------------------------- | ----------------------------------------------------- |
| `/`                                     | `{ kind: "root" }`                                    |
| `/login`, `/signup`                     | `{ kind: "login" }`, `{ kind: "signup" }`             |
| `/invite/:token`                        | `{ kind: "invite", token }`                           |
| `/s/:token[/:slug]`                     | `{ kind: "share", token, slug? }`                     |
| `/account[/security\|/sessions]`        | `{ kind: "account", section }`                        |
| `/spaces`, `/spaces/new`                | `{ kind: "spaces", section: "list" \| "new" }`        |
| `/h/:hid`                               | `{ kind: "space", area: { kind: "home" } }`           |
| `/h/:hid/search`                        | area `{ kind: "search" }`                             |
| `/h/:hid/inbox[/:eventId]`              | area `{ kind: "inbox", eventId? }`                    |
| `/h/:hid/catalog[/:appId]`              | area `{ kind: "catalog", appId? }`                    |
| `/h/:hid/settings[/:section[/:itemId]]` | area `{ kind: "settings", section \| null, itemId? }` |
| `/h/:hid/a/:appId/*`                    | area `{ kind: "app", appId, appPath, basename }`      |
| `/dev/registry[/:appId]`, `/dev/health` | `{ kind: "dev", section, appId? }`                    |
| anything else                           | `{ kind: "not-found" }`                               |

Settings sections are `general`, `members`, `apps`, `notifications`,
`shared`, `data`; only `members` and `apps` take an `itemId`. A bare
`settings` parses with `section: null` — the shell redirects it to
`general`. Shell sections never accept extra trailing segments.

`routeZone(route)` classifies a route as `public` (no session needed),
`personal` (the person's account, outside any household), `space` or
`platform`.

Shell links are built with `paths` (`apps/host/src/router/paths.ts`), the
inverse of `parseRoute` — never by concatenating strings by hand.
`paths.login({ from })` puts the original address in the shell-owned
`_from` query parameter.

`SessionGate` (`apps/host/src/session/`) owns the one `HostRouter` and
decides redirects with `decideRouteRedirect`: no session + non-public route
→ `/login?_from=…`; session + `/login`/`/signup` → `_from` or the first
household; `/` → first household; bare `settings` → `settings/general`.

Reserved root segments (`RESERVED_ROOT_SEGMENTS`) never match the shape of
a language code (`^[a-z]{2}(-[a-z]{2})?$`): the marketing site shares the
root namespace via `/:lang/`.

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
  canonicalize(): void; // re-run the hid redirect once the household list changes
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
