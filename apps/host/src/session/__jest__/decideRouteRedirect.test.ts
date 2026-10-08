import { parseRoute } from "../../router";
import { decideRouteRedirect, readReturnAddress, RedirectSession } from "../decideRouteRedirect";

const HOUSEHOLDS = [{ hid: "f3k2xp", name: "Семья" }];
const signedIn: RedirectSession = { kind: "signed-in", households: HOUSEHOLDS };
const expired: RedirectSession = { kind: "signed-out", keepReturnAddress: true };
const loggedOut: RedirectSession = { kind: "signed-out", keepReturnAddress: false };

function decide(href: string, session: RedirectSession): string | null {
  const url = new URL(href, "http://host.invalid");
  const location = { pathname: url.pathname, search: url.search, hash: url.hash };
  return decideRouteRedirect(parseRoute(url.pathname), location, session);
}

describe("decideRouteRedirect", () => {
  it("leaves the address alone while the session is unknown", () => {
    expect(decide("/h/f3k2xp/a/recipes", { kind: "pending" })).toBeNull();
    expect(decide("/", { kind: "pending" })).toBeNull();
  });

  describe("signed out", () => {
    it("sends a protected address to /login carrying it in _from", () => {
      expect(decide("/h/f3k2xp/a/recipes/r/1?q=2#steps", expired)).toBe(
        "/login?_from=%2Fh%2Ff3k2xp%2Fa%2Frecipes%2Fr%2F1%3Fq%3D2%23steps",
      );
      expect(decide("/account/security", expired)).toBe("/login?_from=%2Faccount%2Fsecurity");
      expect(decide("/dev/health", expired)).toBe("/login?_from=%2Fdev%2Fhealth");
    });

    it("drops the return address after an explicit logout", () => {
      expect(decide("/h/f3k2xp", loggedOut)).toBe("/login");
    });

    it("sends the bare root to /login without _from", () => {
      expect(decide("/", expired)).toBe("/login");
    });

    it.each(["/login", "/signup", "/invite/t", "/s/t/slug", "/nowhere"])(
      "keeps the public %s",
      (href) => {
        expect(decide(href, expired)).toBeNull();
      },
    );
  });

  describe("signed in", () => {
    it("leaves /login for the return address", () => {
      expect(decide("/login?_from=%2Fh%2Ff3k2xp%2Fa%2Frecipes%3Fx%3D1", signedIn)).toBe(
        "/h/f3k2xp/a/recipes?x=1",
      );
    });

    it("leaves /login and /signup for the first household without a return address", () => {
      expect(decide("/login", signedIn)).toBe("/h/f3k2xp");
      expect(decide("/signup", signedIn)).toBe("/h/f3k2xp");
    });

    it("leaves /signup for the root when there is no household yet", () => {
      expect(decide("/signup", { kind: "signed-in", households: [] })).toBe("/");
    });

    it("sends the root to the first household", () => {
      expect(decide("/", signedIn)).toBe("/h/f3k2xp");
      expect(decide("/", { kind: "signed-in", households: [] })).toBeNull();
    });

    it("sends a bare settings to its general section", () => {
      expect(decide("/h/f3k2xp-semya/settings", signedIn)).toBe("/h/f3k2xp-semya/settings/general");
    });

    it.each(["/h/f3k2xp", "/h/f3k2xp/settings/members", "/account", "/invite/t"])(
      "keeps %s",
      (href) => {
        expect(decide(href, signedIn)).toBeNull();
      },
    );
  });
});

describe("readReturnAddress", () => {
  it("accepts a same-origin relative path", () => {
    expect(readReturnAddress("?_from=%2Fh%2Ff3k2xp")).toBe("/h/f3k2xp");
  });

  it.each([
    ["missing", ""],
    ["absolute URL", "?_from=https%3A%2F%2Fevil.example"],
    ["protocol-relative", "?_from=%2F%2Fevil.example"],
    ["backslash trick", "?_from=%2F%5Cevil.example"],
    ["not a path", "?_from=h%2Ff3k2xp"],
    ["login loop", "?_from=%2Flogin%3F_from%3D%2Fh"],
    ["signup loop", "?_from=%2Fsignup"],
  ])("rejects %s", (_name, search) => {
    expect(readReturnAddress(search)).toBeNull();
  });
});
