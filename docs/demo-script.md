# Demo script

A guided walkthrough of what the platform actually does, reproducible from
a clean clone. Every step below was run against a live instance before
being written down — none of this is speculative.

## Setup

```bash
git clone <this-repo>
cd hostyara
corepack enable
yarn install
yarn dev
```

`yarn dev` starts three servers together: the host shell
(`http://localhost:3000`), the React remote `demo-recipes`
(`http://localhost:5174`), and the Vue remote `demo-budget`
(`http://localhost:5175`). Wait for all three to report ready, then open
`http://localhost:3000`.

## 1. Two apps, two frameworks, one shell

The host redirects `/` to a canonical household URL,
`/h/demo-semya-ivanovyh`, and shows a dock with three links: **Рецепты**
(recipes, React), **Рецепты (iframe)** (the same app over the iframe
transport instead of Module Federation), and **Бюджет** (budget, Vue).

Click **Рецепты**. The URL becomes `.../a/recipes` and a card list of
recipes renders — this is `apps/demo-recipes`, a plain React app, mounted
live via Module Federation with no page reload. Click **Бюджет** next: the
URL becomes `.../a/budget`, the recipes UI is unmounted, and a completely
different Vue app (`apps/demo-budget`) mounts in its place. Same dock, same
shell chrome, two unrelated framework runtimes taking turns in the same
slot.

## 2. Style isolation

Each app is mounted into its own **open shadow root**
(`document.querySelector('[data-app="recipes"]').shadowRoot`). Open
devtools and inspect it — you'll see CSS Modules class names like
`recipes-src_App_module_css-title`, scoped per-app by the bundler, not
global classes that could collide between recipes and budget. Both apps
share the platform's design tokens (`--ui-color-*` etc.) but choose
different token values for their own accents — recipes' `.title` uses
`--ui-color-primary` (a purple), budget's uses `--ui-color-info` — proving
they style independently without needing to coordinate or leak into each
other.

Check `document.head` while either app is mounted: no `<style>` or
`<link>` tags land there from the remotes (the ones you do see are the
host's own Vite-injected dev styles) — this is enforced by the
conformance suite's `checkDocumentHeadUntouched`, described in
[app-module.md](./app-module.md).

## 3. Navigation: deep links and a working Back button

Open a **fresh tab** directly at:

```
http://localhost:3000/h/demo-semya-ivanovyh/a/budget
```

Budget cold-starts directly — no need to land on the home screen first and
click through. This is a real link a user could bookmark or share.

Back in the first tab: click into a recipe (**Паста карбонара**, URL
becomes `.../a/recipes/r/8421`), then click **Бюджет**. Press the browser's
**Back** button — you land back on the recipe detail, not on a blank tab or
the wrong app; **Forward** returns you to budget. The host owns
`window.history` for exactly this reason — see
[routing.md](./routing.md) for how.

## 4. Remote failure isolation

With all three servers still running, stop just the recipes dev server
(`Ctrl-C` in its terminal, or find and kill the process bound to port
5174). Navigate to `.../a/recipes` (or refresh if you're already there).

The slot shows a recoverable error — _"Не удалось загрузить «Рецепты»"_ —
with a **Повторить** (retry) button. Critically, the dock itself is
unaffected: **Бюджет** is still clickable and mounts normally. One remote
crashing takes down only its own slot, not the shell.

Restart the recipes server (`yarn workspace @hostyara/demo-recipes dev`)
and either click **Повторить** or navigate to `.../a/recipes` again — it
loads normally, no host restart needed.

(This exact scenario is also covered by an automated test:
`apps/host/e2e/error-states.spec.ts`.)

## 5. Swapping a remote for your own local build

Point the live host at a different `remoteEntry.js` for one app without
touching `registry.json`, via a query param:

```
http://localhost:3000/h/demo-semya-ivanovyh/a/recipes?_remote=recipes@http://localhost:5174/remoteEntry.js
```

That example points at the same server the registry already uses, so
nothing visibly changes — the useful case is pointing it at a _different_
port where you're running your own work-in-progress build of `recipes`
(or any other registered app id). Try it against a port nothing is
listening on and you'll see the same recoverable error from step 4,
confirming the override actually took effect rather than silently falling
back to the registry's own URL. See [manifest.md](./manifest.md) for the
full `?_remote=` format.

## What this demonstrates, in one paragraph

A shell that mounts independently-built, independently-framework-choosing
remotes side by side, isolates their styling and DOM without coordination
between the app teams, keeps navigation (including Back/Forward and deep
links) coherent across app boundaries despite the shell being the only
thing that touches `window.history`, contains a remote's failure to its
own slot instead of taking down the whole page, and lets a developer test
their own in-progress build against the live shell without redeploying
anything.
