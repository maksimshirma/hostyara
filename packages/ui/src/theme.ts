import { colors, spacing, typography } from "./tokens";

export interface Theme {
  colors: typeof colors;
  spacing: typeof spacing;
  typography: typeof typography;
}

export const defaultTheme: Theme = {
  colors,
  spacing,
  typography,
};
