import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

// Both cookies use the `__Host-` prefix (Secure, Path=/, no Domain) — Hono's
// `prefix: "host"` enforces those attributes. Browsers treat
// http://localhost as a secure context, so this works in local dev too.
const SESSION_COOKIE = "session";
const LOGIN_COOKIE = "login";

const BASE_OPTIONS = {
  prefix: "host",
  httpOnly: true,
  sameSite: "Lax",
  path: "/",
  secure: true,
} as const;

export function setSessionCookie(c: Context, id: string, expiresAt: Date): void {
  setCookie(c, SESSION_COOKIE, id, { ...BASE_OPTIONS, expires: expiresAt });
}

export function readSessionCookie(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE, "host");
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, BASE_OPTIONS);
}

export function setLoginCookie(c: Context, id: string, expiresAt: Date): void {
  setCookie(c, LOGIN_COOKIE, id, { ...BASE_OPTIONS, expires: expiresAt });
}

export function readLoginCookie(c: Context): string | undefined {
  return getCookie(c, LOGIN_COOKIE, "host");
}

export function clearLoginCookie(c: Context): void {
  deleteCookie(c, LOGIN_COOKIE, BASE_OPTIONS);
}
