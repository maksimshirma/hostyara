/** @jest-environment node */
import { isAllowedIdentityPath } from "../identity-allowlist";

describe("isAllowedIdentityPath", () => {
  it.each([
    ["POST", "/api/auth/organization/create"],
    ["GET", "/api/auth/organization/list"],
    ["POST", "/api/auth/two-factor/enable"],
    ["GET", "/api/auth/list-sessions"],
    ["POST", "/api/auth/revoke-session"],
    ["POST", "/api/auth/revoke-other-sessions"],
    ["POST", "/account/security/pat"],
    ["DELETE", "/account/security/pat/p1"],
    ["GET", "/grant-requests"],
    ["POST", "/grant-requests"],
    ["POST", "/grant-requests/r1/approve"],
    ["POST", "/org/transfer-ownership"],
  ])("allows %s %s", (method, path) => {
    expect(isAllowedIdentityPath(method, path)).toBe(true);
  });

  it.each([
    ["POST", "/api/auth/sign-in/email"],
    ["POST", "/api/auth/sign-out"],
    ["GET", "/api/auth/get-session"],
    ["GET", "/introspect"],
    ["GET", "/introspect/household"],
    ["POST", "/token"],
    ["GET", "/jwks.json"],
    ["GET", "/docs"],
    ["GET", "/api/auth/organization/"],
    ["POST", "/api/auth/list-sessions"],
    ["GET", "/org/transfer-ownership"],
    ["GET", "/account/security/../../token"],
    ["GET", "/grant-requests/./x"],
  ])("refuses %s %s", (method, path) => {
    expect(isAllowedIdentityPath(method, path)).toBe(false);
  });
});
