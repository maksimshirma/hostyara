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

- `SessionGate` renders nothing of the shell until `/auth/me` confirms a
  session; otherwise it shows login/registration, the 2FA code step, or
  "create a household". Any `unauthenticated` answer from the BFF — including
  one caused by an app's `sdk.api` call — and the SSE stream's
  `session.ended` bring the login screen back; the URL is kept.
- `HostChrome` takes the user and households from the gate. An app is mounted
  only when `decideAppAccess` (`chrome/appAccess.ts`) allows it — installed in
  the household and granted to the person. Otherwise the slot says why: "not
  connected", "no access" with buttons to request view/edit
  (`POST /identity/grant-requests`), "no access to this household", or a
  retryable "could not check access". When access is revoked while an app is
  open, it is unmounted on the spot (IA 13.7); the dock lists only installed
  apps.

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
