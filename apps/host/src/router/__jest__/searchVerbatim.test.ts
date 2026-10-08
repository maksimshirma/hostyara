import { parseSearchVerbatim, stringifySearchVerbatim } from "../searchVerbatim";

describe("searchVerbatim", () => {
  it("keeps values as strings rather than JSON", () => {
    expect(parseSearchVerbatim("?servings=4&flag=true&id=007")).toEqual({
      servings: "4",
      flag: "true",
      id: "007",
    });
  });

  it.each(["?q=a+b", "?q=a%20b", "?tag=%22a%22&tag=b", "?x=%7E&y=~", ""])(
    "returns %p untouched while the parsed object is unchanged",
    (raw) => {
      expect(stringifySearchVerbatim({ ...parseSearchVerbatim(raw) })).toBe(raw);
    },
  );

  it("builds a fresh query once the values change", () => {
    const search = parseSearchVerbatim("?q=a+b&page=1");
    expect(stringifySearchVerbatim({ ...search, page: "2" })).toBe("?q=a+b&page=2");
  });

  it("drops undefined values and stringifies the rest", () => {
    expect(stringifySearchVerbatim({ _from: "/h/x", empty: undefined, n: 3 })).toBe(
      "?_from=%2Fh%2Fx&n=3",
    );
  });
});
