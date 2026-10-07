/** @jest-environment node */
import { parseEnv } from "../env";

const REQUIRED = {
  IDENTITY_URL: "http://localhost:3001",
  SESSION_ENC_KEY: "a2V5",
  POSTGRES_USER: "admin",
  POSTGRES_PASSWORD: "secret",
  POSTGRES_DB: "hostyara_bff",
};

describe("parseEnv", () => {
  it("applies defaults for optional values", () => {
    const env = parseEnv(REQUIRED);

    expect(env.publicPort).toBe(4000);
    expect(env.internalPort).toBe(4001);
    expect(env.publicUrl).toBe("http://localhost:4000");
    expect(env.clientId).toBe("hostyara-bff");
    expect(env.trustProxy).toBe(false);
    expect(env.postgres).toEqual({
      host: "localhost",
      port: 5432,
      user: "admin",
      password: "secret",
      database: "hostyara_bff",
    });
  });

  it("reads explicit values", () => {
    const env = parseEnv({
      ...REQUIRED,
      PORT: "5000",
      INTERNAL_PORT: "5001",
      BFF_PUBLIC_URL: "https://hostyara.app",
      BFF_CLIENT_ID: "bff-2",
      POSTGRES_PORT: "5434",
      TRUST_PROXY: "true",
    });

    expect(env.publicPort).toBe(5000);
    expect(env.internalPort).toBe(5001);
    expect(env.publicUrl).toBe("https://hostyara.app");
    expect(env.clientId).toBe("bff-2");
    expect(env.postgres.port).toBe(5434);
    expect(env.trustProxy).toBe(true);
  });

  it.each(Object.keys(REQUIRED))("fails without %s", (name) => {
    const source = { ...REQUIRED, [name]: undefined };

    expect(() => parseEnv(source)).toThrow(`Missing required env var: ${name}`);
  });

  it("rejects a malformed port", () => {
    expect(() => parseEnv({ ...REQUIRED, PORT: "abc" })).toThrow(
      "Invalid port in env var PORT: abc",
    );
  });
});
