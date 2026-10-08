import { ReactNode } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { dataDisplayCustomizations } from "./customizations/dataDisplay";
import { feedbackCustomizations } from "./customizations/feedback";
import { inputsCustomizations } from "./customizations/inputs";
import { navigationCustomizations } from "./customizations/navigation";
import { surfacesCustomizations } from "./customizations/surfaces";
import { colorSchemes, CSS_VAR_PREFIX, shadows, shape, typography } from "./themePrimitives";

// Ключ и значения ("system" | "light" | "dark") совпадают с прежним
// переключателем темы, поэтому сохранённый выбор пользователя переживает
// переход на MUI.
export const THEME_STORAGE_KEY = "theme";

export const appTheme = createTheme({
  // data-theme на <html> — тот же атрибут, по которому переключается
  // tokens.css, так что MUI-хром и ремоуты на токенах меняют схему вместе.
  cssVariables: { colorSchemeSelector: "data-theme", cssVarPrefix: CSS_VAR_PREFIX },
  colorSchemes,
  typography,
  shadows,
  shape,
  components: {
    ...inputsCustomizations,
    ...dataDisplayCustomizations,
    ...feedbackCustomizations,
    ...navigationCustomizations,
    ...surfacesCustomizations,
  },
});

export function AppTheme({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={appTheme} modeStorageKey={THEME_STORAGE_KEY} disableTransitionOnChange>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
