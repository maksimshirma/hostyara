// Every lifetime the BFF enforces, in one place (cookie-session-transport.md,
// "Как внедрять" п.7) — never inline these values elsewhere.
export const TTL = {
  // __Host-session cookie and the identity session behind it; sliding.
  sessionMs: 7 * 24 * 60 * 60 * 1000,
  // How often an active session re-reads its expiry and cookie from
  // identity-service, keeping both sides of the sliding window in step.
  sessionSyncMs: 60 * 60 * 1000,
  // Cached /introspect/household result (bff-placement.md п.3).
  introspectionMs: 30 * 1000,
  // Pending 2FA step between sign-in and TOTP verification.
  loginChallengeMs: 5 * 60 * 1000,
  // SSE keep-alive comment interval; also how often an open stream checks
  // that its BFF session still exists. Below common 30-60 s proxy idle timeouts.
  sseHeartbeatMs: 25 * 1000,
  // Upper bound for a single proxied call to identity-service or a sub-app backend.
  upstreamTimeoutMs: 10 * 1000,
} as const;
