/** @jest-environment node */
import { isSdkApiError } from "../sdk-api";

describe("isSdkApiError", () => {
  it("accepts the rejection shape", () => {
    expect(isSdkApiError({ name: "SdkApiError", code: "no_grant", status: 403 })).toBe(true);
    expect(
      isSdkApiError({ name: "SdkApiError", code: "http_error", status: 422, body: { field: "x" } }),
    ).toBe(true);
  });

  it("survives a structured clone (the iframe channel)", () => {
    const cloned = structuredClone({ name: "SdkApiError", code: "upstream_timeout", status: 504 });

    expect(isSdkApiError(cloned)).toBe(true);
  });

  it.each([
    null,
    undefined,
    "SdkApiError",
    new Error("boom"),
    { name: "SdkApiError", code: "x" },
    { code: "x", status: 1 },
  ])("rejects %p", (value) => {
    expect(isSdkApiError(value)).toBe(false);
  });
});
