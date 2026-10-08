// identity-service's cookies never reach the browser: the BFF keeps them as a
// ready-to-send `Cookie` header value and folds every Set-Cookie it receives
// into that value, the way a browser cookie jar would.

interface SetCookie {
  name: string;
  value: string;
  removed: boolean;
}

function parseSetCookie(header: string, now: Date): SetCookie | null {
  const [pair, ...attributes] = header.split(";");
  const separator = pair.indexOf("=");
  if (separator <= 0) {
    return null;
  }
  const name = pair.slice(0, separator).trim();
  const value = pair.slice(separator + 1).trim();

  let removed = value === "";
  for (const attribute of attributes) {
    const [rawKey, ...rest] = attribute.split("=");
    const key = rawKey.trim().toLowerCase();
    const attributeValue = rest.join("=").trim();
    if (key === "max-age" && Number(attributeValue) <= 0) {
      removed = true;
    }
    if (key === "expires" && new Date(attributeValue).getTime() <= now.getTime()) {
      removed = true;
    }
  }
  return { name, value, removed };
}

function parseCookieHeader(header: string): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator > 0) {
      cookies.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
    }
  }
  return cookies;
}

export function applySetCookies(
  cookieHeader: string,
  setCookieHeaders: string[],
  now: Date,
): string {
  const cookies = parseCookieHeader(cookieHeader);
  for (const header of setCookieHeaders) {
    const cookie = parseSetCookie(header, now);
    if (!cookie) {
      continue;
    }
    if (cookie.removed) {
      cookies.delete(cookie.name);
    } else {
      cookies.set(cookie.name, cookie.value);
    }
  }
  return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
}
