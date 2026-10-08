import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export interface VerifyOptions {
  audience: string;
  // For checking expiry without waiting out the 60 s TTL.
  currentDate?: Date;
}

// How a sub-app backend is expected to check the internal JWT
// (cookie-session-transport.md п.5): signature against identity-service's
// JWKS, then `aud`, then `exp` — regardless of who sent the request.
export function createInternalJwtVerifier(identityUrl: string) {
  const jwks = createRemoteJWKSet(new URL("/jwks.json", identityUrl));
  return async (token: string, options: VerifyOptions): Promise<JWTPayload> => {
    const { payload } = await jwtVerify(token, jwks, {
      audience: options.audience,
      currentDate: options.currentDate,
    });
    return payload;
  };
}

// A minimal sub-app backend: answers with the verified claims, or 401.
export async function startFixtureBackend(identityUrl: string, appId: string) {
  const verify = createInternalJwtVerifier(identityUrl);
  const server: Server = createServer(async (req, res) => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Internal ") ? header.slice("Internal ".length) : "";
    try {
      const claims = await verify(token, { audience: appId });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ path: req.url, claims, cookie: req.headers.cookie ?? null }));
    } catch (err) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ reason: (err as { code?: string }).code ?? "invalid" }));
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    verify,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
