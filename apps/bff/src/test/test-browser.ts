import type { Hono } from "hono";

let nextIp = 1;

// One simulated browser: its own __Host- cookie jar and its own IP (sent as
// X-Forwarded-For through a trusted proxy, so identity-service rate-limits
// each browser separately). Every Set-Cookie it ever receives is recorded in
// `allSetCookies` for leak assertions.
export function createTestBrowser(
  app: Pick<Hono, "request">,
  origin: string,
  allSetCookies: string[],
) {
  const cookies = new Map<string, string>();
  const ip = `198.51.100.${nextIp++}`;

  async function request(
    path: string,
    init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
  ) {
    const headers: Record<string, string> = {
      "Sec-Fetch-Site": "same-origin",
      Origin: origin,
      "X-Forwarded-For": ip,
      ...init.headers,
    };
    if (cookies.size > 0) {
      headers.Cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
    }
    if (init.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const res = await app.request(path, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    for (const header of res.headers.getSetCookie()) {
      allSetCookies.push(header);
      const [pair, ...attributes] = header.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      const cleared = attributes.some((a) => /max-age=0/i.test(a.trim())) || value === "";
      if (cleared) cookies.delete(name);
      else cookies.set(name, value);
    }
    return res;
  }

  async function json<T = any>(
    path: string,
    init?: Parameters<typeof request>[1],
  ): Promise<{ status: number; body: T }> {
    const res = await request(path, init);
    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : undefined) as T };
  }

  return { request, json, cookies, ip };
}

export type TestBrowser = ReturnType<typeof createTestBrowser>;
