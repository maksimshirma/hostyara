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

Open `http://localhost:3000` — it redirects to a demo household and shows
the app dock. Other commands, run from `apps/host/` or via
`yarn workspace @hostyara/host <script>`:

```bash
yarn build            # tsc --noEmit && vite build -> dist/
yarn preview           # preview the production build locally
yarn e2e               # Playwright e2e suite
yarn storybook          # Storybook at http://localhost:6006
```

See [docs/demo-script.md](../../docs/demo-script.md) at the repo root for
a guided walkthrough of what the host actually does (cross-app navigation,
style isolation, remote failure isolation, the `?_remote=` override).
