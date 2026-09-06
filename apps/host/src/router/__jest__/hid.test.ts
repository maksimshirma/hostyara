import { canonicalizeHidSegment, resolveHid } from "../hid";

describe("resolveHid", () => {
  it("resolves everything up to the first hyphen", () => {
    expect(resolveHid("f3k2xp-semya-ivanovyh")).toBe("f3k2xp");
  });

  it("returns the whole segment when there is no hyphen", () => {
    expect(resolveHid("f3k2xp")).toBe("f3k2xp");
  });

  it("ignores everything after the first hyphen, even a stale name", () => {
    expect(resolveHid("f3k2xp-nasha-kvartira")).toBe("f3k2xp");
  });
});

describe("canonicalizeHidSegment", () => {
  it("appends the slugified name to the hid", () => {
    expect(canonicalizeHidSegment("f3k2xp", "Семья Ивановых")).toBe("f3k2xp-semya-ivanovyh");
  });

  it("returns the bare hid when there is no name", () => {
    expect(canonicalizeHidSegment("f3k2xp", undefined)).toBe("f3k2xp");
  });

  it("returns the bare hid when the name is not transliterable", () => {
    expect(canonicalizeHidSegment("f3k2xp", "!!!")).toBe("f3k2xp");
  });
});
