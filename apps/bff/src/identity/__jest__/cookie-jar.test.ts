/** @jest-environment node */
import { applySetCookies } from "../cookie-jar";

const NOW = new Date("2030-01-01T00:00:00Z");

describe("applySetCookies", () => {
  it("adds cookies from Set-Cookie headers, dropping attributes", () => {
    const result = applySetCookies(
      "",
      ["better-auth.session_token=abc.sig; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800"],
      NOW,
    );

    expect(result).toBe("better-auth.session_token=abc.sig");
  });

  it("replaces an existing cookie and keeps the others", () => {
    const result = applySetCookies(
      "a=1; better-auth.session_token=old",
      ["better-auth.session_token=new; Path=/"],
      NOW,
    );

    expect(result).toBe("a=1; better-auth.session_token=new");
  });

  it("removes cookies cleared by Max-Age=0, a past Expires, or an empty value", () => {
    const result = applySetCookies(
      "better-auth.two_factor=t; better-auth.dont_remember=x; c=1; d=2",
      [
        "better-auth.two_factor=; Max-Age=0; Path=/",
        "better-auth.dont_remember=x; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        "c=",
      ],
      NOW,
    );

    expect(result).toBe("d=2");
  });

  it("keeps '=' inside values", () => {
    expect(applySetCookies("", ["token=a=b==; Path=/"], NOW)).toBe("token=a=b==");
  });

  it("ignores malformed headers and returns the input when nothing changes", () => {
    expect(applySetCookies("a=1", ["garbage", "=novalue"], NOW)).toBe("a=1");
  });
});
