// Значения из tokens.css (рядом) — единый источник цветов платформы: его
// же хост внедряет в shadow root подприложений (переменные --ui-*). MUI
// нужны литералы (alpha/lighten не работают с var()), поэтому они
// продублированы здесь; совпадение с CSS проверяет __jest__/tokens.test.ts.

export const violet = {
  50: "#f5f3ff",
  100: "#ede9fe",
  200: "#ddd6fe",
  300: "#c4b5fd",
  400: "#a78bfa",
  500: "#8b5cf6",
  600: "#7c3aed",
  700: "#6d28d9",
  800: "#5b21b6",
  900: "#4c1d95",
};

export const gray = {
  50: "#f6f6f8",
  100: "#f0f0f3",
  200: "#e4e4e9",
  300: "#d3d3da",
  400: "#a5a5b0",
  500: "#8b8d98",
  600: "#6b6c76",
  700: "#4a4b54",
  800: "#2c2d33",
  900: "#17171a",
};

export const semantic = {
  success: { main: "#16b871", bg: "#e6faf1" },
  warning: { main: "#ff9f43", bg: "#fff2e3" },
  danger: { main: "#f0473f", bg: "#fde9e8" },
  info: { main: "#4f7dfb", bg: "#eaf0ff" },
};

export const surfaces = {
  light: {
    bg: "#ffffff",
    bgSubtle: gray[50],
    surface: "#ffffff",
    border: gray[200],
    text: gray[900],
    textSecondary: gray[500],
    textDisabled: gray[400],
  },
  dark: {
    bg: gray[900],
    bgSubtle: "#0e0e11",
    surface: gray[800],
    border: gray[700],
    text: gray[50],
    textSecondary: gray[300],
    textDisabled: gray[500],
  },
};

export const onPrimary = "#ffffff";

export const fontFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// --ui-border-radius-md: 0.625rem
export const borderRadiusPx = 10;
