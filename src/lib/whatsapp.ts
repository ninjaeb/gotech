import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/email-crypto";
import type { WhatsAppAccount } from "@/generated/prisma/client";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export const WHATSAPP_ACCOUNT_ID = "singleton";

// Digits only, country code included, no "+" — matches both the wa.me
// click-to-chat format (src/lib/format.ts) and the "wa_id"/"from" format
// WhatsApp's webhook payloads and Cloud API "to" field use.
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Best-effort match: an exact digits match first, falling back to a suffix
// match (stored number at least 8 digits) to cover a Contact whose phone
// was entered without the country code that a wa_id always includes. Pulls
// every phone-bearing contact rather than a SQL pattern match since the
// variable, free-text formats phones get entered in aren't something a
// single WHERE clause can normalize — fine at CRM contact-list scale.
export async function findContactIdByWhatsAppPhone(waId: string): Promise<string | null> {
  const digits = normalizePhone(waId);
  if (!digits) return null;

  const contacts = await db.contact.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
  });

  let suffixMatch: string | null = null;
  for (const contact of contacts) {
    const contactDigits = normalizePhone(contact.phone!);
    if (!contactDigits) continue;
    if (contactDigits === digits) return contact.id;
    if (suffixMatch === null && contactDigits.length >= 8 && digits.endsWith(contactDigits)) {
      suffixMatch = contact.id;
    }
  }
  return suffixMatch;
}

// Meta signs each webhook POST body with the App Secret via HMAC-SHA256,
// sent as "sha256=<hex>" in the X-Hub-Signature-256 header — verifying this
// against the RAW body (before any JSON parsing) is the only thing standing
// between this public, unauthenticated endpoint and anyone who finds the URL.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
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

export type WhatsAppConnectionConfig = {
  phoneNumberId: string;
  accessToken: string;
};

// Confirms the phone number ID actually belongs to this access token before
// we save either — mirrors testEmailConnection's "verify before persist".
// Also fetches the human-readable number so the Settings UI can show it
// without asking the user to type it in twice.
export async function testWhatsAppConnection(
  config: WhatsAppConnectionConfig,
): Promise<{ displayPhoneNumber: string | null }> {
  const response = await fetch(
    `${GRAPH_API_BASE}/${config.phoneNumberId}?fields=display_phone_number,verified_name`,
    { headers: { Authorization: `Bearer ${config.accessToken}` } },
  );
  const body: { display_phone_number?: string; error?: { message?: string } } = await response.json();
  if (!response.ok) {
    throw new Error(body.error?.message ?? `Meta API returned ${response.status}`);
  }
  return { displayPhoneNumber: body.display_phone_number ?? null };
}

export class WhatsAppSendError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.name = "WhatsAppSendError";
    this.code = code;
  }
}

// Business-initiated messages sent more than 24h after the customer's last
// message are rejected with this code ("re-engagement message") — WhatsApp
// requires a pre-approved message template to open a new conversation
// outside that window; freeform text only works to reply within it. Most of
// this app only ever replies within that window, so that case surfaces as a
// clear error rather than a silent failure or a confusing raw API message.
// sendWhatsAppTemplateMessage below is the one caller that's proactive by
// design (the daily task digest) and so always needs a template, not text.
const OUTSIDE_SERVICE_WINDOW_CODE = 131047;

export async function sendWhatsAppMessage(
  account: WhatsAppAccount,
  toPhone: string,
  body: string,
): Promise<string> {
  const accessToken = decryptSecret(account.encryptedAccessToken);
  const response = await fetch(`${GRAPH_API_BASE}/${account.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhone(toPhone),
      type: "text",
      text: { body },
    }),
  });
  const payload: { messages?: { id: string }[]; error?: { message?: string; code?: number } } = await response.json();
  if (!response.ok) {
    const code = payload.error?.code;
    const message =
      code === OUTSIDE_SERVICE_WINDOW_CODE
        ? "This contact hasn't messaged you on WhatsApp in the last 24 hours. Outside that window, WhatsApp requires a pre-approved message template to start a new conversation — a plain reply only works within 24h of their last message to you."
        : (payload.error?.message ?? `WhatsApp API returned ${response.status}`);
    throw new WhatsAppSendError(message, code);
  }
  const messageId = payload.messages?.[0]?.id;
  if (!messageId) throw new WhatsAppSendError("WhatsApp accepted the request but returned no message id.");
  return messageId;
}

// A template message, not text — the only message type WhatsApp allows a
// business to send *proactively* (i.e. not in reply to a recent incoming
// message; see OUTSIDE_SERVICE_WINDOW_CODE above). The template itself must
// already exist and be approved in Meta Business Manager before this will
// succeed; see the README's WhatsApp section for the exact one this app
// expects for the daily task digest.
export async function sendWhatsAppTemplateMessage(
  account: WhatsAppAccount,
  toPhone: string,
  templateName: string,
  languageCode: string,
  bodyParameters: string[],
): Promise<string> {
  const accessToken = decryptSecret(account.encryptedAccessToken);
  const response = await fetch(`${GRAPH_API_BASE}/${account.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhone(toPhone),
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components:
          bodyParameters.length > 0
            ? [{ type: "body", parameters: bodyParameters.map((text) => ({ type: "text", text })) }]
            : [],
      },
    }),
  });
  const payload: { messages?: { id: string }[]; error?: { message?: string; code?: number } } = await response.json();
  if (!response.ok) {
    throw new WhatsAppSendError(payload.error?.message ?? `WhatsApp API returned ${response.status}`, payload.error?.code);
  }
  const messageId = payload.messages?.[0]?.id;
  if (!messageId) throw new WhatsAppSendError("WhatsApp accepted the request but returned no message id.");
  return messageId;
}
