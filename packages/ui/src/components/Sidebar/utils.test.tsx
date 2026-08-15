import { extractTextFromChildren } from "./utils";

describe("extractTextFromChildren", () => {
  it("returns a plain string child as-is", () => {
    expect(extractTextFromChildren("Dashboard")).toBe("Dashboard");
  });

  it("extracts text from an icon + label children tree", () => {
    const children = (
      <>
        <svg />
        <span>Dashboard</span>
      </>
    );
    expect(extractTextFromChildren(children)).toBe("Dashboard");
  });

  it("extracts nested text content", () => {
    const children = (
      <span>
        <strong>Dashboard</strong>
      </span>
    );
    expect(extractTextFromChildren(children)).toBe("Dashboard");
  });

  it("returns an empty string when there is no text content", () => {
    expect(extractTextFromChildren(<svg />)).toBe("");
  });
});
