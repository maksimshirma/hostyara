/** @jest-environment node */
import { Hono } from "hono";
import { csrfProtection, isRequestAllowed } from "../csrf";

const ORIGIN = "https://hostyara.app";

describe("isRequestAllowed", () => {
  it.each([
    ["same-origin", "POST", true],
    ["none", "POST", true],
    ["same-origin", "GET", true],
    ["cross-site", "GET", false],
    ["cross-site", "POST", false],
    ["same-site", "POST", false],
  ])("Sec-Fetch-Site=%s %s -> %s", (secFetchSite, method, expected) => {
    expect(isRequestAllowed({ method, secFetchSite, origin: undefined }, ORIGIN)).toBe(expected);
  });

  it("trusts Fetch Metadata over a forged-looking Origin", () => {
    expect(
      isRequestAllowed({ method: "POST", secFetchSite: "cross-site", origin: ORIGIN }, ORIGIN),
    ).toBe(false);
  });

  describe("without Fetch Metadata", () => {
    it.each(["GET", "HEAD", "OPTIONS"])("allows safe method %s", (method) => {
      expect(isRequestAllowed({ method, secFetchSite: undefined, origin: undefined }, ORIGIN)).toBe(
        true,
      );
    });

    it("allows a state-changing request from the public origin", () => {
      expect(
        isRequestAllowed({ method: "POST", secFetchSite: undefined, origin: ORIGIN }, ORIGIN),
      ).toBe(true);
    });

    it.each([["https://evil.example"], ["https://app.hostyara.app"], ["null"], [undefined]])(
      "refuses a state-changing request with Origin %s",
      (origin) => {
        expect(
          isRequestAllowed({ method: "DELETE", secFetchSite: undefined, origin }, ORIGIN),
        ).toBe(false);
      },
    );
  });
});

describe("csrfProtection", () => {
  const app = new Hono();
  app.use("*", csrfProtection(`${ORIGIN}/some/path`));
  app.post("/auth/login", (c) => c.json({ ok: true }));

  it("passes allowed requests through", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Sec-Fetch-Site": "same-origin" },
    });

    expect(res.status).toBe(200);
  });

  it("answers 403 to a cross-site request", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Sec-Fetch-Site": "cross-site" },
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("compares against the origin of the configured public URL", async () => {
    const res = await app.request("/auth/login", { method: "POST", headers: { Origin: ORIGIN } });

    expect(res.status).toBe(200);
  });
});
