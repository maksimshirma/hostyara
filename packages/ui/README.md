# @hostyara/ui

The shared design system: CSS custom-property tokens (`--ui-color-*`,
`--ui-spacing-*`, `--ui-font-*`, ...) and a small set of React components
(`Button`, `Sidebar` and its subcomponents) built on top of them. Consumed
by the host shell directly and referenced by remotes' own CSS via the same
token names, so an app's styling stays visually consistent with the shell
without importing React components across the host/remote boundary.

## Installation

Workspace-internal package (peer-depends on `react`/`react-dom` ^19):

```json
{
  "dependencies": {
    "@hostyara/ui": "workspace:^"
  }
}
```

then `yarn install` from the repo root.

## Usage

```tsx
import { Button } from "@hostyara/ui";
import "@hostyara/ui/src/tokens/tokens.css";

function Toolbar() {
  return (
    <Button variant="primary" onClick={() => console.log("clicked")}>
      Save
    </Button>
  );
}
```

Reference the same tokens from your own CSS Modules without importing any
component:

```css
.title {
  color: var(--ui-color-primary);
  font-size: var(--ui-font-size-lg);
}
```

Run `yarn storybook` from the repo root to browse every component
interactively.
