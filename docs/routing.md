# URL scheme and history

## URL shape

```
/h/:hidSegment/a/:appId/*
```

Everything up to and including `a/:appId` belongs to the shell; everything
after belongs to your app. The shell routes with
[TanStack Router](https://tanstack.com/router): the whole route table (IA §4)
is the code-based tree in `apps/host/src/router/routes.ts`. Each leaf
carries `staticData.toHostRoute`, which turns the matched params into the
host's own view of the address — the `Route` union from
`apps/host/src/router/route.ts` that menus, breadcrumbs, page titles and
the SDK reason about. `routeForPath(pathname)` (`router/hostRoute.ts`)
derives it synchronously anywhere; `useRoute()` inside route components:

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
`general`. Shell sections never accept extra trailing segments: TanStack
matches fuzzily and puts the unmatched rest under `**`, which
`routeForPath` treats as `not-found`.

The tree has three pathless layouts: `_auth` (sign-in, sign-up), `_public`
(invitation, shared link — minimal chrome, no breadcrumbs, IA §5) and
`_shell` (the person's account, households, `/dev`). Screens are attached
to the routes in `apps/host/src/app/routeComponents.tsx`, so `router/`
stays free of UI. A 404 under `/h/:hid` renders inside the shell
(`spaceRoute.notFoundComponent`); any other 404 is standalone.

`routeZone(route)` classifies a route as `public` (no session needed),
`personal` (the person's account, outside any household), `space` or
`platform`.

Shell links are typed TanStack links (`RouterLink`/`RouterButton` from
`apps/host/src/components/RouterLink.tsx`, `linkOptions({ to, params })`) —
never strings built by hand. The only raw hrefs are addresses inside an app
(the breadcrumb tail an app publishes), rendered with `HrefLink`.

Redirects are one pure function, `decideRouteRedirect`
(`router/redirectRules.ts`), executed by the root route's `beforeLoad` with
the session from the router context: no session + non-public route →
`/login?_from=…`; session + `/login`/`/signup` → `_from` (same-origin paths
only) or the first household; `/` → first household; a stale or bare
household address → its canonical form; bare `settings` →
`settings/general`. `SessionGate` passes the session in the router context,
calls `router.invalidate()` when it changes, and calls the same function
while rendering so it never shows a screen the person is being taken away
from.

Reserved root segments (`RESERVED_ROOT_SEGMENTS`) never match the shape of
a language code (`^[a-z]{2}(-[a-z]{2})?$`): the marketing site shares the
root namespace via `/:lang/`.

`hidSegment` is not the raw household id — it's the id optionally followed
by a slugified household name (`hid-slugified-name`), canonicalized by
`canonicalizeHidSegment`. `resolveHid` strips everything from the first
hyphen onward to recover the real `hid`. An old bare-hid link
(`/h/abc123/...`) keeps working: the root guard redirects it to the
canonical slugged form with `replace` (no extra history entry) rather than
404ing. A household the person isn't in (or before the list is loaded) is
left alone.

`a`, `catalog`, `inbox`, `search`, and `settings` are reserved first-level
segments inside a household space — your `appId` can never collide with
one of these, because an app's routes always appear after the literal `a/`
segment.

## Why apps never touch `window.history`

The host owns `window.history` for the whole page, across every mounted
app, so it can also own things that only make sense at that level: scroll
position per history entry, canonical-URL redirects, and coordinating which
app is even mounted for a given path. If your app called `pushState`
directly, the host's router wouldn't know a navigation happened. Use
`sdk.router` — see [sdk-reference.md](./sdk-reference.md) — and see
[shared-realm.md](./shared-realm.md) for how direct access is discouraged
in dev and checked in the conformance suite.

## The host history

`createHostHistory()` (`apps/host/src/router/hostHistory.ts`) is the one
writer to `window.history`. It is built on TanStack's `createHistory` and
differs from TanStack's own browser history in two ways:

- **It writes synchronously.** `sdk.router.location` must reflect a
  `navigate()` made just before it (`packages/router-react` relies on it),
  so there is no microtask batching.
- **Every write is marked as the host's own** (`withGuardSuppressed`), so
  the dev history guard (`router/historyGuard.ts`) warns only about apps
  writing directly.

Each entry's `state` carries `__TSR_key` and `__TSR_index`; `popstate` is
reported to subscribers as BACK/FORWARD/GO from the index difference.
TanStack Router (`createAppRouter`, `router/appRouter.ts`) runs over this
history. Its search serializers (`router/searchVerbatim.ts`) keep values as
strings and give back the original query string byte for byte while it is
unchanged — TanStack otherwise re-serializes the query as JSON and, on
mount, replaces a URL whose rebuilt form differs (IA §3: an app's query is
not the shell's to rewrite).

## From host coordinates to app coordinates

`createSdkRouter` (`router/createSdkRouter.ts`) adapts the host history into
the per-app, basename-relative `SdkRouter` your app actually receives. App
navigations go straight into the history with the href as is; TanStack only
matches them.

```ts
export function getLiveBasename(history: RouterHistory, appId: string): string {
  const route = routeForPath(history.location.pathname);
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
`sdk.share`). Once the address no longer belongs to your app, `navigate` is
ignored.

If you use React Router or Vue Router, adapt through
`@hostyara/router-react`'s `createReactRouterHistory` or
`@hostyara/router-vue`'s `createVueRouterHistory` rather than calling
`sdk.router` yourself — see [sdk-reference.md](./sdk-reference.md).

## Scroll restoration

TanStack Router's scroll restoration (`scrollRestoration: true`), keyed per
history entry by `__TSR_key` (`getScrollRestorationKey`), so Back restores
each entry's own position — including Back from one app into another.
Apps never see or manage this.
