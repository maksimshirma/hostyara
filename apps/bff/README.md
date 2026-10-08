# @hostyara/bff

Backend-for-frontend of the hostyara shell. The browser only ever holds an
HttpOnly cookie to this service; the BFF keeps the identity-service session
server-side, resolves the user's household access through identity-service,
and proxies sub-app backend calls with a short-lived internal JWT. Design
rationale: the identity RFCs (`token-storage.md`, `bff-placement.md`,
`cookie-session-transport.md`, `access.md`, `server-to-server.md`).

Current state: two listeners, server-side sessions and the auth routes
(signup, login with 2FA, logout, me). The gateway and live access updates come
in the following tasks.

## Installation

Requires Node 22+, Docker, and the repo's Yarn workspaces.

```bash
# from the repo root
corepack enable
yarn install

cd apps/bff
cp .env.example .env     # defaults work for local dev
docker compose up -d     # Postgres on :5434, wait for "healthy" in `docker compose ps`
yarn db:migrate
```

identity-service must run separately on `:3001` (`PORT=3001 pnpm dev` in its
repo) — the host already uses `:3000`.

## Usage

```bash
yarn workspace @hostyara/bff dev        # tsx watch, restarts on save
curl localhost:4000/health              # {"status":"ok"}; 503 if Postgres is down
```

Other scripts (`yarn workspace @hostyara/bff <script>`):

| Script            | What it does                                            |
| ----------------- | ------------------------------------------------------- |
| `build` / `start` | compile to `dist/` / run the compiled build             |
| `typecheck`       | `tsc --noEmit` (also part of the root `yarn typecheck`) |
| `db:migrate`      | apply pending migrations                                |

Tests live in `src/**/__jest__/`. From the repo root:

```bash
yarn test               # unit tests (no database), part of CI
yarn test:integration   # *.integration.test.ts — needs this app's Postgres (`docker compose up -d`)
                        # and a running identity-service; recreates <POSTGRES_DB>_test on every run
```

## Listeners

| Port | Env             | Audience                          | Routes                                         |
| ---- | --------------- | --------------------------------- | ---------------------------------------------- |
| 4000 | `PORT`          | browser, same origin as the shell | `GET /health`, `/auth/*` (below)               |
| 4001 | `INTERNAL_PORT` | private network only              | `GET /health`, `POST /webhooks/access-changed` |

The internal listener will receive identity-service webhooks, which are not
signed — never expose it publicly.

## Configuration

All variables are listed with comments in [`.env.example`](.env.example).
Required: `IDENTITY_URL`, `SESSION_ENC_KEY`, `POSTGRES_USER`,
`POSTGRES_PASSWORD`, `POSTGRES_DB`. Every lifetime the BFF enforces (session,
introspection cache, 2FA challenge, upstream timeout) lives in
[`src/config/ttl.ts`](src/config/ttl.ts) and nowhere else.

## Layout

```
src/
  main.ts           starts both listeners, graceful shutdown
  server.ts         builds the public and internal Hono apps
  config/           env parsing, TTLs
  db/               Kysely instance, schema, migration registry and runner
  session/          session id/crypto, __Host- cookies, store, requireSession middleware
  middleware/       csrf (Fetch Metadata + Origin fallback) on every public route
  access/           introspection cache, household-access loader, gateway decision
  gateway/          upstream URL/header rules, app_backends lookup
  events/           in-memory access.changed fan-out to SSE connections
  identity/         identity-service client; folds its Set-Cookie into a stored Cookie value
  routes/           route handlers
  test/             integration-test database setup
```

## Auth routes

| Method | Path               | Body                        | Result                                                                                                               |
| ------ | ------------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/signup`     | `{ email, password, name }` | `{ user }` + `__Host-session`; identity rejection → `{ error: "rejected", code }` with its status                    |
| POST   | `/auth/login`      | `{ email, password }`       | `{ user }` + `__Host-session`, or `{ twoFactor: true }` + `__Host-login`; wrong password → 401 `invalid_credentials` |
| POST   | `/auth/2fa/verify` | `{ code }`                  | `{ user }` + `__Host-session`; wrong code → 401 `invalid_code` (retry allowed until the challenge expires)           |
| POST   | `/auth/logout`     | —                           | `{ ok: true }`; signs out at identity-service and deletes the BFF session (the latter even if identity is down)      |
| GET    | `/auth/me`         | —                           | `{ userId, user }` or 401 `unauthenticated`                                                                          |

identity-service being unreachable answers 502 `upstream_unavailable` / 504
`upstream_timeout`. The identity cookie never appears in any response.

The browser's IP is forwarded to identity-service as `X-Forwarded-For` so
Better-Auth rate-limits per user, not per BFF. Set `TRUST_PROXY=true` only
behind our own reverse proxy (then the last `X-Forwarded-For` entry is used).

## identity-service passthrough

`ANY /identity/<path>` forwards to identity-service `<path>` with the stored
identity cookie — the only way the shell reaches identity's own APIs, since
the browser never talks to it directly. Allowed (`routes/identity-allowlist.ts`):
`/api/auth/organization/*`, `/api/auth/two-factor/*`, `GET /api/auth/list-sessions`,
`POST /api/auth/revoke-session|revoke-other-sessions`, `/account/security/*`,
`/grant-requests[/*]`, `POST /org/transfer-ownership`. Everything else is 404 —
notably `/introspect*`, `/token`, `/jwks.json` and the sign-in/out endpoints.

Identity's `Set-Cookie` updates the stored cookie and is never returned. A 401
ends the BFF session only if `get-session` confirms the identity session is
gone (a wrong password on step-up re-auth is also a 401).

## Household access

`GET /api/h/:hid/access` → `{ role, installedApps, grants, permissions }` for
the current user in household `hid` — what the shell needs to choose between
"not connected", "request access" and rendering an app. 403 `forbidden` when
the user is not a member (the body never reveals whether `hid` exists).

Every `/api/*` route runs `requireSession` + `keepSessionAlive`. Results of
identity-service's `/introspect/household` are cached in memory per (BFF
session, household) for `TTL.introspectionMs` (30 s); only successful answers
are cached. The cache is per process — the BFF runs as a single instance.

## Gateway

`ANY /api/h/:hid/apps/:appId/*` proxies to the sub-app backend registered for
`appId`:

1. household access from the introspection cache (see above);
2. app not installed → 404 `not_installed`; installed without a grant → 403
   `no_grant` (the shell shows "request access");
3. a fresh internal JWT from identity-service (`POST /token?grant_type=session`,
   `aud = appId`, 60 s) on **every** call;
4. the request goes to `base_url + sub-path` with `Authorization: Internal <jwt>`;
   the backend's response carries `X-Hostyara-Upstream: app`, so the host can
   tell it from the BFF's own `{ error }` answers.
   Browser `Cookie`/`Authorization` and hop-by-hop headers are dropped; the
   backend's `Set-Cookie` never reaches the browser; the response streams back.

Request bodies are capped at 10 MB (413). Encoded `..` segments are refused
(400). An unreachable backend answers 502 `upstream_unavailable`, a slow one
504 `upstream_timeout` (`TTL.upstreamTimeoutMs`).

Backends are registered by hand, one row per app:

```sql
insert into app_backends (app_id, base_url) values ('recipes', 'http://recipes-service:8080');
```

## Live access updates

identity-service posts `{ hid, userId?, appId? }` to the internal
`POST /webhooks/access-changed` on every role / membership / grant / install
change (`BFF_WEBHOOK_URL` on its side). The BFF drops the matching
introspection cache entries at once and publishes the event to open tabs.

`GET /api/h/:hid/events` is a Server-Sent Events stream for one household,
authorized by `__Host-session` (membership is checked on connect):

| Event            | Data              | Meaning                                    |
| ---------------- | ----------------- | ------------------------------------------ |
| `ready`          | `{ hid }`         | subscribed                                 |
| `access.changed` | `{ hid, appId? }` | re-read access (`/api/h/:hid/access`)      |
| `session.ended`  | `{}`              | the BFF session is gone; the stream closes |

A `: heartbeat` comment goes out every `TTL.sseHeartbeatMs` (25 s); each one
also re-checks that the session still exists. Events without `userId` reach
every member watching the household. Delivery is in-process (single instance).

## Sessions

The browser holds `__Host-session` (HttpOnly, Secure, SameSite=Lax, Path=/)
with a random 256-bit id. Postgres stores only its SHA-256 (`bff_sessions.id_hash`)
and the identity-service session cookie encrypted with AES-256-GCM under
`SESSION_ENC_KEY` — a database dump yields neither usable BFF cookies nor
identity sessions. The pending 2FA step lives in `login_challenges`, referenced by
the `__Host-login` cookie and removed once the code is accepted. Expired rows are ignored on lookup and swept hourly.

The BFF session's expiry is always identity-service's: it is read from
`get-session` at login, on `/auth/me`, and — via `keepSessionAlive` — at most
once per `TTL.sessionSyncMs` on any authenticated route, which also slides the
`__Host-session` cookie to the same moment. A 401 from identity-service ends
the BFF session.

Migrations are registered explicitly in `src/db/migrations/index.ts` (no
directory scan); name new ones with the next numeric prefix.

## CSRF

Every public route goes through `middleware/csrf.ts`: with Fetch Metadata,
only `Sec-Fetch-Site: same-origin` or `none` passes (`same-site` is refused
too); without it, state-changing methods need `Origin` equal to the origin of
`BFF_PUBLIC_URL`. Combined with `SameSite=Lax` cookies this is the platform's
single CSRF perimeter — sub-app backends are never called by the browser.

## Full-stack integration suite

`src/__jest__/full-stack.integration.test.ts` runs the BFF in-process against
the real identity-service (`IDENTITY_URL`, started with `PORT=3001
TRUSTED_ORIGINS=http://localhost:3000`) and a fixture sub-app backend that
verifies internal JWTs through identity's `/jwks.json` (`src/test/fixture-backend.ts`
— the reference for how an app backend should check them). It covers login
with and without 2FA, the gateway (`not_installed` / `no_grant` / `forbidden`),
grant requests, logout invalidating the identity session, revoked sessions and
removed members being cut off, tokens with a foreign `aud`, expired or forged,
and that no browser ever receives an identity cookie.

identity-service has no API for installing an app into a household, so the
suite writes `installed_apps` directly, using the database settings from the
sibling `../identity-service/.env` (`IDENTITY_SERVICE_DIR` to override).
