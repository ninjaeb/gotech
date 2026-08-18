// No `import "server-only"` here (unlike src/lib/auth/session.ts) — this
// module is also imported by scripts/sync-email.ts, a plain CLI entry point
// that runs outside Next's bundler (where that guard doesn't resolve at
// all). Nothing client-side has a reason to import this module anyway.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// Encrypts IMAP/SMTP passwords at rest. The key is derived from
// SESSION_SECRET (already a required env var for login sessions) via HKDF
// with a distinct "info" label, so connecting a mailbox needs no separate
// secret to provision — but it's still a key of its own, domain-separated
// from the one that signs session cookies.
function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return Buffer.from(hkdfSync("sha256", secret, "", "gotech-crm:email-credentials", 32));
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
