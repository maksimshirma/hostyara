import { slugify } from "../slugify";

describe("slugify", () => {
  it("transliterates Cyrillic, lowercases, and hyphenates spaces", () => {
    expect(slugify("Семья Ивановых")).toBe("semya-ivanovyh");
  });

  it("collapses non-alphanumeric runs into a single hyphen", () => {
    expect(slugify("Наша  квартира!!")).toBe("nasha-kvartira");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  Дача  ")).toBe("dacha");
  });

  it("truncates to 24 characters without a trailing hyphen", () => {
    const slug = slugify("Очень длинное название пространства для теста");
    expect(slug.length).toBeLessThanOrEqual(24);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("passes through already-Latin text", () => {
    expect(slugify("My Home 2026")).toBe("my-home-2026");
  });

  it("returns an empty string for untransliterable input", () => {
    expect(slugify("!!!")).toBe("");
  });
});
