import { SdkApiError, SdkApiErrorCode, SdkApiRequestInit } from "@hostyara/contracts";

// Set by the BFF gateway on responses that come from an app's own backend,
// as opposed to the BFF's own `{ error }` answers.
const UPSTREAM_HEADER = "X-Hostyara-Upstream";

const BFF_ERROR_CODES = new Set<SdkApiErrorCode>([
  "unauthenticated",
  "forbidden",
  "not_installed",
  "no_grant",
  "bad_request",
  "payload_too_large",
  "upstream_unavailable",
  "upstream_timeout",
]);

export type BffRequestInit = SdkApiRequestInit;

export interface BffClient {
  // Resolves with the parsed body; rejects with SdkApiError.
  request<T = unknown>(path: string, init?: BffRequestInit): Promise<T>;
}

export interface BffClientOptions {
  // Called once per request that the BFF answered with `unauthenticated`
  // (the session is gone) — the shell switches to its login screen.
  onUnauthenticated(): void;
  fetch?: typeof fetch;
}

export function apiError(code: SdkApiErrorCode, status: number, body?: unknown): SdkApiError {
  return body === undefined
    ? { name: "SdkApiError", code, status }
    : { name: "SdkApiError", code, status, body };
}

export function buildUrl(path: string, query?: Record<string, string>): string {
  const search = query ? new URLSearchParams(query).toString() : "";
  return search ? `${path}${path.includes("?") ? "&" : "?"}${search}` : path;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  const isJson = (response.headers.get("Content-Type") ?? "").includes("json");
  if (!isJson) {
    return text;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function toApiError(response: Response, body: unknown): SdkApiError {
  if (response.headers.get(UPSTREAM_HEADER) === "app") {
    return apiError("http_error", response.status, body);
  }
  const code = (body as { error?: unknown } | null)?.error;
  if (typeof code === "string" && BFF_ERROR_CODES.has(code as SdkApiErrorCode)) {
    return apiError(code as SdkApiErrorCode, response.status);
  }
  return apiError("http_error", response.status, body);
}

export function createBffClient(options: BffClientOptions): BffClient {
  const doFetch = options.fetch ?? ((input, init) => window.fetch(input, init));

  return {
    async request<T>(path: string, init: BffRequestInit = {}): Promise<T> {
      const headers: Record<string, string> = { Accept: "application/json", ...init.headers };
      const hasBody = init.body !== undefined;
      if (hasBody) {
        headers["Content-Type"] = "application/json";
      }
      let response: Response;
      try {
        response = await doFetch(buildUrl(path, init.query), {
          method: init.method ?? "GET",
          headers,
          body: hasBody ? JSON.stringify(init.body) : undefined,
          credentials: "same-origin",
        });
      } catch {
        throw apiError("network_error", 0);
      }
      const body = await readBody(response);
      if (response.ok) {
        return body as T;
      }
      const error = toApiError(response, body);
      if (error.code === "unauthenticated") {
        options.onUnauthenticated();
      }
      throw error;
    },
  };
}
