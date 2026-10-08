/** @jest-environment node */
import {
  buildDownstreamHeaders,
  buildUpstreamHeaders,
  buildUpstreamUrl,
} from "../upstream-request";

describe("buildUpstreamHeaders", () => {
  it("drops browser credentials and hop-by-hop headers and adds the internal token", () => {
    const headers = buildUpstreamHeaders(
      new Headers({
        Cookie: "__Host-session=sid",
        Authorization: "Bearer stolen",
        Connection: "keep-alive, X-Secret-Hop",
        "X-Secret-Hop": "1",
        "Transfer-Encoding": "chunked",
        Host: "shell.example",
        "Content-Length": "12",
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Request-Id": "r1",
      }),
      "jwt",
    );

    expect(Object.fromEntries(headers)).toEqual({
      accept: "application/json",
      authorization: "Internal jwt",
      "content-type": "application/json",
      "x-request-id": "r1",
    });
  });
});

describe("buildDownstreamHeaders", () => {
  it("drops cookies, hop-by-hop headers and the already-decoded encoding", () => {
    const upstream = new Headers({
      "Content-Type": "application/json",
      "Content-Encoding": "gzip",
      "Content-Length": "42",
      "Cache-Control": "no-store",
      Connection: "close",
    });
    upstream.append("Set-Cookie", "evil=1; Path=/");

    expect(Object.fromEntries(buildDownstreamHeaders(upstream))).toEqual({
      "cache-control": "no-store",
      "content-type": "application/json",
    });
  });
});

describe("buildUpstreamUrl", () => {
  it("appends the sub-path and query to the base path", () => {
    expect(buildUpstreamUrl("http://recipes:8080/v1/", "/items/42", "?q=soup")?.toString()).toBe(
      "http://recipes:8080/v1/items/42?q=soup",
    );
    expect(buildUpstreamUrl("http://recipes:8080", "/", "")?.toString()).toBe(
      "http://recipes:8080/",
    );
  });

  it.each(["/../admin", "/items/%2e%2e/%2e%2e/admin", "/a/..%2fsecret", "/a\\..\\b", "/%E0%A4%A"])(
    "rejects %s",
    (path) => {
      expect(buildUpstreamUrl("http://recipes:8080/v1", path, "")).toBeNull();
    },
  );

  it("allows dots that are not traversal", () => {
    expect(buildUpstreamUrl("http://recipes:8080", "/files/a..b/.well-known", "")?.pathname).toBe(
      "/files/a..b/.well-known",
    );
  });
});
