import { createHmac, timingSafeEqual } from "node:crypto";

// Shared by every webhook this app receives that signs its POST body with
// HMAC-SHA256 as "sha256=<hex>" in an X-Hub-Signature-256-style header —
// Meta's WhatsApp Cloud API and GitHub's own webhooks both use this exact
// scheme. Verifying against the RAW body (before any JSON parsing) is the
// only thing standing between a public, unauthenticated endpoint and anyone
// who finds the URL.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  let expectedBuf: Buffer;
  let providedBuf: Buffer;
  try {
    expectedBuf = Buffer.from(expected, "hex");
    providedBuf = Buffer.from(provided, "hex");
  } catch {
    return false;
  }
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}
