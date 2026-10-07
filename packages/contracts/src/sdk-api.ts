// The only way an app reaches its own backend (token-storage.md). The host
// sends the call through the BFF with the user's session; the app never
// sees a token. Everything here is structured-clone-safe, so the same
// contract works across the iframe channel.

export type SdkApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface SdkApiRequestInit {
  method?: SdkApiMethod;
  // Appended to `path` as a query string.
  query?: Record<string, string>;
  headers?: Record<string, string>;
  // Sent as JSON. Omit for GET/DELETE.
  body?: unknown;
}

// `error` codes the BFF answers with, plus `http_error` for a non-2xx status
// coming from the app's own backend (its body is in `body`).
export type SdkApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_installed"
  | "no_grant"
  | "bad_request"
  | "payload_too_large"
  | "upstream_unavailable"
  | "upstream_timeout"
  | "http_error"
  | "network_error";

// Rejection value of `api.request`. A plain object (not an Error subclass)
// so it survives postMessage unchanged; check it with `isSdkApiError`.
export interface SdkApiError {
  readonly name: "SdkApiError";
  readonly code: SdkApiErrorCode;
  // 0 when the request never got an HTTP answer.
  readonly status: number;
  readonly body?: unknown;
}

export function isSdkApiError(value: unknown): value is SdkApiError {
  const candidate = value as Partial<SdkApiError> | null;
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    candidate.name === "SdkApiError" &&
    typeof candidate.code === "string" &&
    typeof candidate.status === "number"
  );
}

export interface SdkApi {
  // `service` must be the calling app's own id — an app can only reach its
  // own backend. Resolves with the parsed JSON body (text for non-JSON,
  // undefined for 204); rejects with SdkApiError.
  request<T = unknown>(service: string, path: string, init?: SdkApiRequestInit): Promise<T>;
}
