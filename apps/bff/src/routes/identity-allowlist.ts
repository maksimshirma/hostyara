// identity-service paths the browser may reach through /identity/* — the
// account, household and access-request APIs the shell's own screens use.
// Sign-in/up/out have dedicated /auth/* routes; /introspect*, /token and
// /jwks.json are server-to-server only and never proxied.
const ALLOWED_PREFIXES = [
  "/api/auth/organization/",
  "/api/auth/two-factor/",
  "/account/security/",
  "/grant-requests/",
];

const ALLOWED_EXACT = new Set([
  "GET /api/auth/list-sessions",
  "POST /api/auth/revoke-session",
  "POST /api/auth/revoke-other-sessions",
  "GET /grant-requests",
  "POST /grant-requests",
  "POST /org/transfer-ownership",
]);

export function isAllowedIdentityPath(method: string, path: string): boolean {
  if (path.split("/").some((segment) => segment === ".." || segment === ".")) {
    return false;
  }
  if (ALLOWED_EXACT.has(`${method.toUpperCase()} ${path}`)) {
    return true;
  }
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix) && path.length > prefix.length);
}
