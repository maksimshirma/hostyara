# Hostyara platform docs

Reference documentation for anyone building a microfrontend ("app") that
runs inside the hostyara shell, or working on the shell itself.

- **[quickstart.md](./quickstart.md)** — build a working app from scratch in
  about 15 minutes, using the dev-harness. Start here.
- **[app-module.md](./app-module.md)** — the `AppModule` contract
  (`mount`/`unmount`) and the conformance suite every app must pass.
- **[sdk-reference.md](./sdk-reference.md)** — the full `HostSDK` your app
  receives at mount time: `context`, `router`, `nav`, `apps`, `share`.
- **[manifest.md](./manifest.md)** — the `AppManifest` format, the registry
  file, contract versioning, and the `?_remote=` dev override.
- **[remote-build.md](./remote-build.md)** — how a remote's build must be
  configured (Module Federation exposes, CSS extraction, `:host`, the three
  entry points: Module Federation, iframe, standalone).
- **[shared-realm.md](./shared-realm.md)** — the isolation rules every app
  must follow (no `window.history`/`location`, prefixed storage keys and
  custom element names, no head pollution) and how each is enforced.
- **[routing.md](./routing.md)** — the host's URL scheme
  (`/h/:hid/a/:appId/*`), how history and scroll restoration work, and why
  apps never touch `window.history` directly.

## What's authoritative

These docs describe the code as it exists in this repo today, verified
against source rather than assumed. Two things they are _not_:

- **Not a replacement for the product design docs.** Code comments
  reference an "IA" (informational architecture) document and a `tech.md`
  by section number (e.g. "IA §9", "tech.md §6") — those are separate
  product-design documents maintained outside this code repo, not files
  you'll find here. This directory documents the implementation; the
  design docs explain the product intent behind it.
- **Not what `README.md`'s package table currently says.** That table
  predates several contract changes (it still lists `MfeModule`,
  `HostContext`, and lifecycle hooks like `bootstrap`/`update`/`destroy`
  that no longer exist) — treat this `docs/` tree as the current source of
  truth for type and contract names, not the root README.
