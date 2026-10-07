/** @jest-environment node */
import { randomBytes } from "node:crypto";
import {
  decryptSecret,
  encryptSecret,
  generateSessionId,
  hashSessionId,
  parseEncryptionKey,
} from "../crypto";

const key = randomBytes(32);

describe("parseEncryptionKey", () => {
  it("accepts a base64 32-byte key", () => {
    expect(parseEncryptionKey(key.toString("base64"))).toEqual(key);
  });

  it("rejects a key of the wrong length", () => {
    expect(() => parseEncryptionKey(randomBytes(16).toString("base64"))).toThrow(
      "SESSION_ENC_KEY must decode to 32 bytes, got 16",
    );
  });
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a value", () => {
    const secret = "better-auth.session_token=abc.def";

    expect(decryptSecret(key, encryptSecret(key, secret))).toBe(secret);
  });

  it("never stores the plaintext and uses a fresh IV each time", () => {
    const secret = "better-auth.session_token=abc.def";
    const a = encryptSecret(key, secret);
    const b = encryptSecret(key, secret);

    expect(a).not.toBe(b);
    expect(Buffer.from(a, "base64").toString("utf8")).not.toContain("abc.def");
  });

  it("fails on a tampered payload", () => {
    const data = Buffer.from(encryptSecret(key, "secret"), "base64");
    data[data.length - 1] ^= 0xff;

    expect(() => decryptSecret(key, data.toString("base64"))).toThrow(
      "unable to authenticate data",
    );
  });

  it("fails with a different key", () => {
    expect(() => decryptSecret(randomBytes(32), encryptSecret(key, "secret"))).toThrow(
      "unable to authenticate data",
    );
  });
});

describe("session ids", () => {
  it("generates unique 256-bit url-safe ids", () => {
    const id = generateSessionId();

    expect(Buffer.from(id, "base64url")).toHaveLength(32);
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(generateSessionId()).not.toBe(id);
  });

  it("hashes deterministically without exposing the id", () => {
    const id = generateSessionId();

    expect(hashSessionId(id)).toBe(hashSessionId(id));
    expect(hashSessionId(id)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionId(id)).not.toContain(id);
  });
});
