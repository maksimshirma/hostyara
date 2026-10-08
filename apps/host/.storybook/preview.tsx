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
