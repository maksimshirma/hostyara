# @hostyara/host

The shell application: owns routing, session/household context, the app
dock, and the mount manager that loads and isolates every microfrontend
(via Module Federation or an iframe). This is what runs at
`http://localhost:3000` and what every remote app is mounted into. See
[docs/](../../docs/) at the repo root for the full platform reference —
this README only covers running the host itself.

## Installation

From the repo root (Yarn workspaces — this app is not installed standalone):

```bash
corepack enable
yarn install
```

## Usage

```bash
# From the repo root — starts the host together with both demo remotes:
yarn dev

# Or just the host on its own (remotes it tries to load won't resolve
# unless they're also running separately):
yarn workspace @hostyara/host dev
```

Open `http://localhost:3000`: the host asks you to sign in (or register),
then to create a household if you have none, and lands in your first
household. That needs the BFF (`apps/bff`) and identity-service running — see
the root README. The dev server proxies `/auth`, `/identity` and `/api` to the
BFF (`BFF_URL`, default `http://localhost:4000`), so the browser stays on one
origin. Other commands, run from `apps/host/` or via
`yarn workspace @hostyara/host <script>`:

```bash
yarn build            # tsc --noEmit && vite build -> dist/
yarn preview           # preview the production build locally
yarn e2e               # Playwright e2e suite (BFF stubbed at the network layer, see e2e/fixtures/bffStub.ts)
yarn e2e:full          # full stack: real BFF + identity-service (local only, see below)
yarn storybook          # Storybook at http://localhost:6006
```

See [docs/demo-script.md](../../docs/demo-script.md) at the repo root for
a guided walkthrough of what the host actually does (cross-app navigation,
style isolation, remote failure isolation, the `?_remote=` override).

## UI and theme (`src/theme/`)

The host chrome is built with [MUI](https://mui.com/material-ui/) (v9,
Emotion). `AppTheme` is a port of the `shared-theme` from MUI's templates
with colours, font and radius taken from `packages/ui` design tokens
(`src/theme/tokens.ts` mirrors `tokens.css`; a unit test keeps them in sync).
Light/dark/system mode goes through MUI's `useColorScheme`
(`ColorModeIconDropdown`): it writes `data-theme` on `<html>` — the same
attribute `tokens.css` switches on — and stores the choice in localStorage
under `theme`. MUI is used only by the host; remote apps keep styling
themselves with the tokens.

```tsx
import { AppTheme, ColorModeIconDropdown } from "./theme";

<AppTheme>
  <ColorModeIconDropdown />
</AppTheme>;
```

## Backend access (`src/api/`)

The host is the only code that talks to the BFF (`apps/bff`); apps get
`sdk.api` and `sdk.access` built on top of it and never see a cookie or token.

- `bffClient.ts` — same-origin `fetch` to the BFF; maps failures to
  `SdkApiError` (`http_error` for the app backend's own answers, marked by
  `X-Hostyara-Upstream`, the BFF's `error` code otherwise).
- `createSdkApi.ts` — `sdk.api.request(service, path)`: only the app's own
  `service`, routed to `/api/h/:hid/apps/:appId/*` for the open household.
- `accessTracker.ts` — the user's access in the open household
  (`/api/h/:hid/access`), kept live by the BFF's SSE stream
  (`/api/h/:hid/events`): re-read on `access.changed`, after a reconnect, and
  on household switches.
- `createSdkAccess.ts` — `sdk.access` (`level`, `can`, `subscribe`,
  `requestAccess`) derived from the tracker on every read.

## Session and access (`src/session/`, `src/chrome/`)

- `SessionGate` owns the host router (exposed to the tree through
  `RouterProvider` / `useRoute`) and renders nothing of the shell until
  `/auth/me` confirms a session. Address rules live in the pure
  `decideRouteRedirect`: without a session every non-public address goes to
  `/login?_from=<original address>`; after signing in the person returns to
  `_from` (same-origin paths only) or their first household; `/` goes to the
  first household; a bare `settings` goes to `settings/general`. Explicit
  logout lands on a plain `/login`. Any `unauthenticated` answer from the
  BFF — including one caused by an app's `sdk.api` call — and the SSE
  stream's `session.ended` bring the login screen back with `_from` set, so
  signing in again returns to the same place.
- Screens before the shell live in `src/pages/auth/` (MUI sign-in/sign-up
  templates on a shared `AuthLayout`): `SignInPage` on `/login`,
  `SignUpPage` on `/signup`, plus the 2FA step, "create a household" and
  "service unavailable". Field checks are the pure `validateSignIn` /
  `validateSignUp`; BFF refusals are shown via `FAILURE_TEXT`.
- `HostChrome` takes the user and households from the gate. An app is mounted
  only when `decideAppAccess` (`chrome/appAccess.ts`) allows it — installed in
  the household and granted to the person. Otherwise the slot says why: "not
  connected", "no access" with buttons to request view/edit
  (`POST /identity/grant-requests`), "no access to this household", or a
  retryable "could not check access". When access is revoked while an app is
  open, it is unmounted on the spot (IA 13.7); the dock lists only installed
  apps.
- The chrome layout (`src/chrome/shell/`) follows MUI's dashboard template:
  `ShellLayout` = a permanent side menu on desktop (household switcher,
  shell sections, the app dock, settings, the person with a logout button)
  and an `AppNavbar` with a slide-in menu below the `md` breakpoint, plus a
  `Header` for breadcrumbs. Menu items come from the pure `buildShellNav`
  and are real `<a href>` links whose plain clicks go through the host
  router (`useRouterLinkClick`), so "open in new tab" keeps working.
- Breadcrumbs (IA §8): the pure `buildBreadcrumbs` gives the shell's own
  links (household, section or app); the open app adds the tail through
  `sdk.nav.setBreadcrumbs` / `setTitle`, which `buildSdk` writes into an
  `appNavStore` bound to the mounted app — calls from an app that is no
  longer open are ignored. `NavbarBreadcrumbs` renders the trail in the
  header and `document.title` follows it (`<page> — Хостяра`).

## Pages (`src/pages/`)

Every shell route from `docs/routing.md` has a page. `ShellPage` is the one
"route → page" mapping; titles come from the pure `shellPageTitle`. Most are
still `PageStub`s ("Раздел в разработке"). `pageChrome` decides where a page
is drawn: household, personal and platform pages sit inside `ShellLayout`;
public pages (`/invite/:token`, `/s/:token`) and a 404 outside `/h/` use the
minimal `PublicLayout` — no menu, no breadcrumbs, a sign-up CTA for anonymous
visitors. Leaving the app area unloads the open app (`closeApp` in
`HostChrome`); the slot element itself stays mounted.

## Full-stack e2e (`e2e-full/`)

`yarn e2e:full` (from the repo root or here) runs the shell against the real
BFF and identity-service: registration and a first household in the UI,
`sdk.api.request` from the Module Federation and iframe apps reaching a
backend that verifies the internal JWT, logout, and a removed member's open
tab losing the app live (identity → `access.changed` webhook → BFF → SSE).
Playwright starts the host, the remotes and the BFF itself; beforehand, run
identity-service and both Postgres instances:

```bash
# ../identity-service
PORT=3001 TRUSTED_ORIGINS=http://localhost:3000 \
  BFF_WEBHOOK_URL=http://localhost:4001/webhooks/access-changed pnpm dev
# apps/bff
docker compose up -d && yarn db:migrate
```

`e2e-full/global-setup.ts` starts the fixture app backends and registers them
in the BFF's `app_backends`. Not part of CI — identity-service lives in
another repository.
