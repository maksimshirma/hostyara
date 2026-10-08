// Vite's ambient types (CSS imports): .storybook/ isn't part of the src
// tsconfig, so editors type-check this file without src/vite-env.d.ts.
/// <reference types="vite/client" />
import type { Preview } from "@storybook/react";
import "../src/theme/tokens.css";
import "../src/index.css";
import { AppTheme } from "../src/theme";

const preview: Preview = {
  decorators: [
    (Story) => (
      <AppTheme>
        <Story />
      </AppTheme>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
