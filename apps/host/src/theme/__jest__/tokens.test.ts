import { readFileSync } from "fs";
import { resolve } from "path";
import { colorSchemes } from "../themePrimitives";
import { fontFamily, gray, semantic, surfaces, violet } from "../tokens";

const css = readFileSync(resolve(__dirname, "../tokens.css"), "utf8");

// Первый блок :root — светлые значения; блок :root[data-theme="dark"] — тёмные.
const lightBlock = css.slice(0, css.indexOf(':root[data-theme="dark"]'));
const darkBlock = css.slice(css.indexOf(':root[data-theme="dark"]'), css.indexOf("@media"));

function readVar(block: string, name: string): string {
  const match = block.match(new RegExp(`--ui-${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`--ui-${name} not found`);
  const value = match[1].replace(/\s+/g, " ").trim();
  const reference = value.match(/^var\(--ui-([\w-]+)\)$/);
  return reference ? readVar(css, reference[1]) : value;
}

describe("theme tokens mirror tokens.css", () => {
  it.each(Object.entries(violet))("primary-%s", (step, value) => {
    expect(readVar(css, `color-primary-${step}`)).toBe(value);
  });

  it.each(Object.entries(gray))("gray-%s", (step, value) => {
    expect(readVar(css, `color-gray-${step}`)).toBe(value);
  });

  it.each([
    ["success", semantic.success],
    ["warning", semantic.warning],
    ["danger", semantic.danger],
    ["info", semantic.info],
  ])("%s", (name, color) => {
    expect(readVar(css, `color-${name}`)).toBe(color.main);
    expect(readVar(css, `color-${name}-bg`)).toBe(color.bg);
  });

  it.each([
    ["light", lightBlock],
    ["dark", darkBlock],
  ] as const)("%s surfaces", (scheme, block) => {
    const expected = surfaces[scheme];
    expect(readVar(block, "color-bg")).toBe(expected.bg);
    expect(readVar(block, "color-bg-subtle")).toBe(expected.bgSubtle);
    expect(readVar(block, "color-surface")).toBe(expected.surface);
    expect(readVar(block, "color-border")).toBe(expected.border);
    expect(readVar(block, "color-text")).toBe(expected.text);
    expect(readVar(block, "color-text-secondary")).toBe(expected.textSecondary);
    expect(readVar(block, "color-text-disabled")).toBe(expected.textDisabled);
  });

  it("font family", () => {
    expect(readVar(css, "font-family")).toBe(fontFamily);
  });
});

describe("colorSchemes", () => {
  it("uses the brand violet as primary in both schemes", () => {
    for (const scheme of ["light", "dark"] as const) {
      const { palette } = colorSchemes[scheme];
      expect(palette.primary.main).toBe(violet[600]);
      expect(palette.background.default).toBe(surfaces[scheme].bgSubtle);
      expect(palette.text.primary).toBe(surfaces[scheme].text);
    }
  });
});
