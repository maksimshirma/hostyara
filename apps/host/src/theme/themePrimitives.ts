import { alpha, createTheme, darken, lighten, Shadows } from "@mui/material/styles";
import {
  borderRadiusPx,
  fontFamily,
  gray as grayTokens,
  onPrimary,
  semantic,
  surfaces,
  violet,
} from "./tokens";

// Основа — shared-theme из шаблонов MUI (mui.com/material-ui/getting-started/templates),
// цвета заменены на токены Хостяры.

declare module "@mui/material/Paper" {
  interface PaperPropsVariantOverrides {
    highlighted: true;
  }
}
declare module "@mui/material/styles" {
  interface ColorRange {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  }

  interface PaletteColor extends ColorRange {}

  interface Palette {
    baseShadow: string;
  }
}

export const CSS_VAR_PREFIX = "hy";

const defaultTheme = createTheme();

export const brand = violet;
export const gray = grayTokens;

type Scale = typeof violet;

// Токены задают для семантических цветов только основной тон и фон;
// кастомизациям шаблона нужна шкала. 50 — фон из токенов, 400 — основной
// тон, остальное выводится из него детерминированно.
function scaleFrom(main: string, bg: string): Scale {
  return {
    50: bg,
    100: lighten(main, 0.8),
    200: lighten(main, 0.6),
    300: lighten(main, 0.3),
    400: main,
    500: darken(main, 0.15),
    600: darken(main, 0.3),
    700: darken(main, 0.45),
    800: darken(main, 0.6),
    900: darken(main, 0.75),
  };
}

export const green = scaleFrom(semantic.success.main, semantic.success.bg);
export const orange = scaleFrom(semantic.warning.main, semantic.warning.bg);
export const red = scaleFrom(semantic.danger.main, semantic.danger.bg);
export const blue = scaleFrom(semantic.info.main, semantic.info.bg);

const primary = {
  light: brand[400],
  main: brand[600],
  dark: brand[800],
  contrastText: onPrimary,
};

const statusColors = {
  info: { light: blue[300], main: blue[400], dark: blue[600], contrastText: onPrimary },
  warning: { light: orange[300], main: orange[400], dark: orange[600] },
  error: { light: red[300], main: red[400], dark: red[600] },
  success: { light: green[300], main: green[400], dark: green[600] },
};

export const colorSchemes = {
  light: {
    palette: {
      primary,
      ...statusColors,
      grey: { ...gray },
      divider: surfaces.light.border,
      background: {
        default: surfaces.light.bgSubtle,
        paper: surfaces.light.surface,
      },
      text: {
        primary: surfaces.light.text,
        secondary: surfaces.light.textSecondary,
        disabled: surfaces.light.textDisabled,
        warning: orange[400],
      },
      action: {
        hover: alpha(gray[200], 0.3),
        selected: alpha(gray[200], 0.5),
      },
      baseShadow: `${alpha(gray[900], 0.06)} 0px 4px 16px 0px, ${alpha(gray[900], 0.06)} 0px 8px 16px -5px`,
    },
  },
  dark: {
    palette: {
      primary,
      ...statusColors,
      grey: { ...gray },
      divider: surfaces.dark.border,
      background: {
        default: surfaces.dark.bgSubtle,
        paper: surfaces.dark.surface,
      },
      text: {
        primary: surfaces.dark.text,
        secondary: surfaces.dark.textSecondary,
        disabled: surfaces.dark.textDisabled,
      },
      action: {
        hover: alpha(gray[600], 0.2),
        selected: alpha(gray[600], 0.3),
      },
      baseShadow: `${alpha("#000000", 0.7)} 0px 4px 16px 0px, ${alpha("#000000", 0.8)} 0px 8px 16px -5px`,
    },
  },
};

export const typography = {
  fontFamily,
  h1: {
    fontSize: defaultTheme.typography.pxToRem(48),
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: -0.5,
  },
  h2: { fontSize: defaultTheme.typography.pxToRem(36), fontWeight: 600, lineHeight: 1.2 },
  h3: { fontSize: defaultTheme.typography.pxToRem(30), lineHeight: 1.2 },
  h4: { fontSize: defaultTheme.typography.pxToRem(24), fontWeight: 600, lineHeight: 1.5 },
  h5: { fontSize: defaultTheme.typography.pxToRem(20), fontWeight: 600 },
  h6: { fontSize: defaultTheme.typography.pxToRem(18), fontWeight: 600 },
  subtitle1: { fontSize: defaultTheme.typography.pxToRem(18) },
  subtitle2: { fontSize: defaultTheme.typography.pxToRem(14), fontWeight: 500 },
  body1: { fontSize: defaultTheme.typography.pxToRem(14) },
  body2: { fontSize: defaultTheme.typography.pxToRem(14), fontWeight: 400 },
  caption: { fontSize: defaultTheme.typography.pxToRem(12), fontWeight: 400 },
};

export const shape = { borderRadius: borderRadiusPx };

export const shadows = [
  "none",
  `var(--${CSS_VAR_PREFIX}-palette-baseShadow)`,
  ...defaultTheme.shadows.slice(2),
] as Shadows;
