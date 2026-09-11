// Encrypts a connected Google account's refresh token at rest. Same HKDF-
// from-SESSION_SECRET, AES-256-GCM shape as src/lib/email-crypto.ts (which
// this deliberately doesn't import — a distinct "info" label keeps the two
// derived keys domain-separated, so this module's blast radius is its own
// even though the source secret is shared).
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return Buffer.from(hkdfSync("sha256", secret, "", "gotech-crm:google-calendar-tokens", 32));
}

const ALGORITHM = "aes-256-gcm";

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((buf) => buf.toString("base64")).join(":");
}

export function decryptSecret(encoded: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed encrypted value");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
