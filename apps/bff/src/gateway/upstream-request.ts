// Pure helpers for turning a browser request into a sub-app backend request
// and the backend's response back into a browser response.

// RFC 9110 §7.6.1 hop-by-hop headers, plus `host`.
const HOP_BY_HOP = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
];

// Never forwarded upstream: browser credentials stay at the BFF, and the
// only identity a sub-app backend sees is the internal JWT.
const STRIPPED_UPSTREAM = new Set([...HOP_BY_HOP, "cookie", "authorization", "content-length"]);

// Never returned to the browser: a backend cannot set cookies on the shell's
// origin, and fetch() has already decoded the body, so the original encoding
// and length no longer describe it.
const STRIPPED_DOWNSTREAM = new Set([
  ...HOP_BY_HOP,
  "set-cookie",
  "content-encoding",
  "content-length",
]);

function connectionTokens(headers: Headers): string[] {
  return (headers.get("connection") ?? "")
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function copyHeaders(source: Headers, stripped: Set<string>): Headers {
  const extra = new Set(connectionTokens(source));
  const result = new Headers();
  source.forEach((value, name) => {
    if (!stripped.has(name) && !extra.has(name)) {
      result.append(name, value);
    }
  });
  return result;
}

export function buildUpstreamHeaders(incoming: Headers, internalToken: string): Headers {
  const headers = copyHeaders(incoming, STRIPPED_UPSTREAM);
  headers.set("Authorization", `Internal ${internalToken}`);
  return headers;
}

export function buildDownstreamHeaders(upstream: Headers): Headers {
  return copyHeaders(upstream, STRIPPED_DOWNSTREAM);
}

// Appends the sub-path to the backend's base URL. Returns null for paths that
// would climb out of the base path once the backend decodes them.
export function buildUpstreamUrl(baseUrl: string, subPath: string, search: string): URL | null {
  const path = subPath.startsWith("/") ? subPath : `/${subPath}`;
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (decoded.split(/[/\\]/).some((segment) => segment === "..")) {
    return null;
  }
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}${path}`;
  url.search = search;
  return url;
}
