import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const SALT = "lovable-clone-integration-v1";

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, SALT, KEY_LEN);
}

export function encryptIntegrationSecret(plain: string, encryptionKey: string): string {
  if (encryptionKey.length < 32) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must be at least 32 characters");
  }
  const key = deriveKey(encryptionKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptIntegrationSecret(
  blob: string,
  encryptionKey: string,
): string {
  if (encryptionKey.length < 32) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must be at least 32 characters");
  }
  const buf = Buffer.from(blob, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const key = deriveKey(encryptionKey);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
