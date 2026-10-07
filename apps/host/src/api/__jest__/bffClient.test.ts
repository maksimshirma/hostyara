/** @jest-environment node */
import { createBffClient } from "../bffClient";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function setup(respond: () => Response | Promise<Response>) {
  const onUnauthenticated = jest.fn();
  const fetchMock = jest.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => respond());
  const bff = createBffClient({ onUnauthenticated, fetch: fetchMock as unknown as typeof fetch });
  return { bff, fetchMock, onUnauthenticated };
}

describe("createBffClient", () => {
  it("sends JSON with the session cookie and parses JSON back", async () => {
    const { bff, fetchMock } = setup(() => jsonResponse({ id: 1 }));

    const result = await bff.request("/api/x", {
      method: "POST",
      query: { q: "a b" },
      body: { title: "Soup" },
    });

    expect(result).toEqual({ id: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/x?q=a+b");
    expect(init).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      body: '{"title":"Soup"}',
    });
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("returns undefined for 204 and text for non-JSON bodies", async () => {
    expect(
      await setup(() => new Response(null, { status: 204 })).bff.request("/a"),
    ).toBeUndefined();
    expect(
      await setup(
        () => new Response("plain", { headers: { "Content-Type": "text/plain" } }),
      ).bff.request("/a"),
    ).toBe("plain");
  });

  it("maps BFF error codes", async () => {
    const { bff } = setup(() => jsonResponse({ error: "no_grant" }, 403));

    await expect(bff.request("/a")).rejects.toEqual({
      name: "SdkApiError",
      code: "no_grant",
      status: 403,
    });
  });

  it("treats any answer from the app backend as http_error, even one shaped like a BFF error", async () => {
    const { bff } = setup(() =>
      jsonResponse({ error: "no_grant" }, 403, { "X-Hostyara-Upstream": "app" }),
    );

    await expect(bff.request("/a")).rejects.toEqual({
      name: "SdkApiError",
      code: "http_error",
      status: 403,
      body: { error: "no_grant" },
    });
  });

  it("reports a lost session to the shell", async () => {
    const { bff, onUnauthenticated } = setup(() => jsonResponse({ error: "unauthenticated" }, 401));

    await expect(bff.request("/a")).rejects.toMatchObject({ code: "unauthenticated" });
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it("maps a network failure to network_error", async () => {
    const { bff } = setup(() => {
      throw new TypeError("Failed to fetch");
    });

    await expect(bff.request("/a")).rejects.toEqual({
      name: "SdkApiError",
      code: "network_error",
      status: 0,
    });
  });
});
