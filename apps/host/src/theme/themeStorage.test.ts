import {
  applyResolvedTheme,
  readStoredThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  writeStoredThemePreference,
} from "./themeStorage";

describe("resolveTheme", () => {
  it("returns light for system preference when system prefers light", () => {
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("returns dark for system preference when system prefers dark", () => {
    expect(resolveTheme("system", true)).toBe("dark");
  });

  it("returns light for explicit light preference regardless of system", () => {
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("returns dark for explicit dark preference regardless of system", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("readStoredThemePreference", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("falls back to system when nothing is stored", () => {
    expect(readStoredThemePreference()).toBe("system");
  });

  it("falls back to system for an invalid stored value", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "purple");
    expect(readStoredThemePreference()).toBe("system");
  });

  it("returns a valid stored preference", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(readStoredThemePreference()).toBe("dark");
  });
});

describe("writeStoredThemePreference", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists the preference under the theme key", () => {
    writeStoredThemePreference("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});

describe("applyResolvedTheme", () => {
  it("sets data-theme on the document element", () => {
    applyResolvedTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");

    applyResolvedTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
