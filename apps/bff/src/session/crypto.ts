import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function parseEncryptionKey(base64: string): Buffer {
  const key = Buffer.from(base64, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(`SESSION_ENC_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}`);
  }
  return key;
}

// AES-256-GCM; output is base64(iv | auth tag | ciphertext). A tampered or
// foreign payload fails authentication in decryptSecret instead of decoding
// to garbage.
export function encryptSecret(key: Buffer, plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function decryptSecret(key: Buffer, payload: string): string {
  const data = Buffer.from(payload, "base64");
  const iv = data.subarray(0, IV_BYTES);
  const tag = data.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = data.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// 256-bit opaque id — the only thing the browser ever holds.
export function generateSessionId(): string {
  return randomBytes(32).toString("base64url");
}

// Only the hash is stored, so a database dump yields no usable cookies.
export function hashSessionId(id: string): string {
  return createHash("sha256").update(id).digest("hex");
}
