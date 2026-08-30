import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/email-crypto";
import { getSiteOrigin } from "@/lib/site-url";
import { notificationHref, type ActivityEntityRefs } from "@/lib/notification-href";
import type { WhatsAppAccount, WhatsAppMediaType, WhatsAppMessageStatus } from "@/generated/prisma/client";

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

// The two fixed prefixes both WhatsApp Activity-writing paths use — the
// outbound send action (src/app/actions/whatsapp-send.ts) and the inbound
// webhook (src/app/api/whatsapp/webhook/route.ts). Shared here so a
// conversation view can recover direction from Activity.content without a
// redundant direction column, and so the two writers and the one reader
// can never drift out of sync with each other.
export const WHATSAPP_SENT_PREFIX = "Sent WhatsApp message: ";
export const WHATSAPP_RECEIVED_PREFIX = "Received WhatsApp message: ";

export type WhatsAppMessageDirection = "INBOUND" | "OUTBOUND";

export function parseWhatsAppActivityContent(content: string): {
  direction: WhatsAppMessageDirection;
  text: string;
} {
  if (content.startsWith(WHATSAPP_RECEIVED_PREFIX)) {
    return { direction: "INBOUND", text: content.slice(WHATSAPP_RECEIVED_PREFIX.length) };
  }
  if (content.startsWith(WHATSAPP_SENT_PREFIX)) {
    return { direction: "OUTBOUND", text: content.slice(WHATSAPP_SENT_PREFIX.length) };
  }
  return { direction: "OUTBOUND", text: content };
}

// A conversation is unread when its latest message is inbound and postdates
// the shared, team-wide read marker (Contact.whatsappLastReadAt) — outbound
// activities never count, regardless of how they compare to that marker,
// since sending a message is itself an implicit "I've seen this thread."
export function isWhatsAppConversationUnread(
  latestContent: string,
  latestCreatedAt: Date,
  lastReadAt: Date | null,
): boolean {
  const { direction } = parseWhatsAppActivityContent(latestContent);
  if (direction !== "INBOUND") return false;
  return !lastReadAt || latestCreatedAt > lastReadAt;
}

export type WhatsAppThreadMedia = {
  type: WhatsAppMediaType;
  url: string;
  mimeType: string;
  name: string | null;
};

export type WhatsAppThreadMessage = {
  id: string;
  direction: WhatsAppMessageDirection;
  text: string;
  createdAt: string;
  status: WhatsAppMessageStatus | null;
  media: WhatsAppThreadMedia | null;
};

// Shared by the thread page's initial load and its poll route so the two
// can never build a differently-shaped message — media is served through
// /api/whatsapp/media/[activityId] rather than embedded here, so a poll
// tick never has to re-serialize a multi-MB attachment's bytes.
export function activityToThreadMessage(activity: {
  id: string;
  content: string;
  createdAt: Date;
  whatsappStatus: WhatsAppMessageStatus | null;
  whatsappMediaType: WhatsAppMediaType | null;
  whatsappMediaMimeType: string | null;
  whatsappMediaName: string | null;
}): WhatsAppThreadMessage {
  const { direction, text } = parseWhatsAppActivityContent(activity.content);
  return {
    id: activity.id,
    direction,
    text,
    createdAt: activity.createdAt.toISOString(),
    status: activity.whatsappStatus,
    media: activity.whatsappMediaType
      ? {
          type: activity.whatsappMediaType,
          url: `/api/whatsapp/media/${activity.id}`,
          mimeType: activity.whatsappMediaMimeType ?? "application/octet-stream",
          name: activity.whatsappMediaName,
        }
      : null,
  };
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

// The number of {{n}} variables (body + button combined) this send actually
// included doesn't match what's approved in Meta Business Manager for that
// template name/language — almost always because the template was edited
// (or a newer app version expects more/fewer variables than what's
// currently approved), never something a retry fixes. Surfaced with the
// counts this send actually sent so it's diagnosable without also having
// Meta's own template editor open side by side.
const PARAM_COUNT_MISMATCH_CODE = 132000;

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
  const payload: {
    messages?: { id: string }[];
    error?: { message?: string; type?: string; code?: number; error_subcode?: number };
  } = await response.json();
  if (!response.ok) {
    const code = payload.error?.code;
    if (code === OUTSIDE_SERVICE_WINDOW_CODE) {
      throw new WhatsAppSendError(
        "This contact hasn't messaged you on WhatsApp in the last 24 hours. Outside that window, WhatsApp requires a pre-approved message template to start a new conversation — a plain reply only works within 24h of their last message to you.",
        code,
      );
    }
    // Meta's error object carries more than just a message — surfacing the
    // rest too (rather than just payload.error.message alone) is what makes
    // an otherwise-generic-sounding error (e.g. "Unsupported request")
    // actually diagnosable against Meta's own error-code docs.
    const rawMessage = payload.error?.message ?? `WhatsApp API returned ${response.status}`;
    const details = [
      payload.error?.type,
      code !== undefined ? `code ${code}` : null,
      payload.error?.error_subcode !== undefined ? `subcode ${payload.error.error_subcode}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    throw new WhatsAppSendError(details ? `${rawMessage} (${details})` : rawMessage, code);
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
  // Only needed when the approved template's own Header has a {{n}}
  // variable in it (a static header needs no component here at all) —
  // numbered independently of the body's own {{1}}/{{2}}/..., so e.g. a
  // header {{1}} and a body {{1}} can (and often do) carry the same value
  // without being "the same" variable to Meta.
  headerParameters: string[] = [],
): Promise<string> {
  const accessToken = decryptSecret(account.encryptedAccessToken);
  const components = [
    ...(headerParameters.length > 0
      ? [{ type: "header", parameters: headerParameters.map((text) => ({ type: "text", text })) }]
      : []),
    ...(bodyParameters.length > 0
      ? [{ type: "body", parameters: bodyParameters.map((text) => ({ type: "text", text })) }]
      : []),
  ];
  const response = await fetch(`${GRAPH_API_BASE}/${account.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhone(toPhone),
      type: "template",
      template: { name: templateName, language: { code: languageCode }, components },
    }),
  });
  const payload: { messages?: { id: string }[]; error?: { message?: string; code?: number } } = await response.json();
  if (!response.ok) {
    const code = payload.error?.code;
    const rawMessage = payload.error?.message ?? `WhatsApp API returned ${response.status}`;
    if (code === PARAM_COUNT_MISMATCH_CODE) {
      throw new WhatsAppSendError(
        `${rawMessage} — this send included ${headerParameters.length} header and ${bodyParameters.length} ` +
          `body variable(s). Check that "${templateName}"'s currently approved header/body in Meta Business ` +
          `Manager expects exactly that many — a template edited there, or a mismatched app version, are the ` +
          `usual causes (see the README).`,
        code,
      );
    }
    throw new WhatsAppSendError(rawMessage, code);
  }
  const messageId = payload.messages?.[0]?.id;
  if (!messageId) throw new WhatsAppSendError("WhatsApp accepted the request but returned no message id.");
  return messageId;
}

export type WhatsAppMediaKind = "image" | "document" | "video";

// This app's own caps, tighter than Meta's for documents (which Meta
// allows up to 100MB) — kept sane for the data:-URL-in-the-database
// approach Activity.whatsappMediaData uses (see schema.prisma), and for
// the Server Action body-size limit (next.config.ts) a base64-inflated
// upload has to fit under. Images/video match Meta's own real caps, which
// would reject a larger file before this ever mattered.
export const MAX_MEDIA_BYTES: Record<WhatsAppMediaKind, number> = {
  image: 5 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  document: 16 * 1024 * 1024,
};

export function whatsAppMediaKindForMimeType(mimeType: string): WhatsAppMediaKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

// Shared by every writer of Activity.whatsappMediaType (the outbound send
// action and the inbound webhook) so the lowercase kind used for Meta's own
// `type` field and this app's uppercase enum column never drift apart.
export const WHATSAPP_MEDIA_KIND_TO_TYPE: Record<WhatsAppMediaKind, WhatsAppMediaType> = {
  image: "IMAGE",
  video: "VIDEO",
  document: "DOCUMENT",
};

// Uploads raw bytes to Meta's Media API and returns the resulting media
// id — a WhatsApp send references media by this id, not by embedding the
// bytes in the /messages call itself. Node's global FormData/Blob (no
// extra package) is enough for the multipart body Meta expects here.
async function uploadWhatsAppMedia(account: WhatsAppAccount, buffer: Buffer, mimeType: string): Promise<string> {
  const accessToken = decryptSecret(account.encryptedAccessToken);
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }));
  const response = await fetch(`${GRAPH_API_BASE}/${account.phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  const payload: { id?: string; error?: { message?: string; code?: number } } = await response.json();
  if (!response.ok || !payload.id) {
    throw new WhatsAppSendError(payload.error?.message ?? `WhatsApp media upload returned ${response.status}`, payload.error?.code);
  }
  return payload.id;
}

// Sends an image/document/video — same "must be within the 24h session
// window unless it's a template" rule as sendWhatsAppMessage applies here
// too (Meta returns the same OUTSIDE_SERVICE_WINDOW_CODE for a media send
// as for a text one). `caption` renders below the media on WhatsApp;
// `filename` only matters for (and is only shown on) a document.
export async function sendWhatsAppMediaMessage(
  account: WhatsAppAccount,
  toPhone: string,
  kind: WhatsAppMediaKind,
  buffer: Buffer,
  mimeType: string,
  options: { caption?: string; filename?: string } = {},
): Promise<string> {
  const accessToken = decryptSecret(account.encryptedAccessToken);
  const mediaId = await uploadWhatsAppMedia(account, buffer, mimeType);
  const mediaObject: { id: string; caption?: string; filename?: string } = { id: mediaId };
  if (options.caption) mediaObject.caption = options.caption;
  if (kind === "document" && options.filename) mediaObject.filename = options.filename;

  const response = await fetch(`${GRAPH_API_BASE}/${account.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhone(toPhone),
      type: kind,
      [kind]: mediaObject,
    }),
  });
  const payload: { messages?: { id: string }[]; error?: { message?: string; code?: number } } = await response.json();
  if (!response.ok) {
    const code = payload.error?.code;
    if (code === OUTSIDE_SERVICE_WINDOW_CODE) {
      throw new WhatsAppSendError(
        "This contact hasn't messaged you on WhatsApp in the last 24 hours. Outside that window, WhatsApp requires a pre-approved message template to start a new conversation — a plain reply (or attachment) only works within 24h of their last message to you.",
        code,
      );
    }
    throw new WhatsAppSendError(payload.error?.message ?? `WhatsApp API returned ${response.status}`, code);
  }
  const messageId = payload.messages?.[0]?.id;
  if (!messageId) throw new WhatsAppSendError("WhatsApp accepted the request but returned no message id.");
  return messageId;
}

// The webhook only ever hands us a short-lived media id for an inbound
// image/document/video — the actual bytes are a separate, authenticated
// round trip: look up a temporary download URL for that id, then fetch it.
// Returns null (never throws) on any failure — the caller falls back to
// logging a plain placeholder, same as it always has, rather than losing
// the whole webhook delivery over one attachment.
export async function downloadWhatsAppMedia(
  account: WhatsAppAccount,
  mediaId: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const accessToken = decryptSecret(account.encryptedAccessToken);
    const metaResponse = await fetch(`${GRAPH_API_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaResponse.ok) return null;
    const meta: { url?: string; mime_type?: string; file_size?: number } = await metaResponse.json();
    if (!meta.url) return null;
    const kind = whatsAppMediaKindForMimeType(meta.mime_type ?? "");
    if (meta.file_size !== undefined && meta.file_size > MAX_MEDIA_BYTES[kind]) return null;

    const fileResponse = await fetch(meta.url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!fileResponse.ok) return null;
    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    if (buffer.byteLength > MAX_MEDIA_BYTES[kind]) return null;
    return { buffer, mimeType: meta.mime_type ?? "application/octet-stream" };
  } catch (error) {
    console.error("Downloading inbound WhatsApp media failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

// Must match an approved template in Meta Business Manager exactly — see
// the README's WhatsApp section for the exact text to submit. A template,
// not plain text, for the same reason as the daily task digest: whoever
// mentioned someone is very unlikely to be within that recipient's own
// 24h WhatsApp reply window.
export const MENTION_TEMPLATE_NAME = "mention_notification";
const MENTION_TEMPLATE_LANGUAGE = "en";

// The other direction: forwarding a reply back to whoever's swipe-reply it
// answers — first the mentioner, then (if they reply too) back to the
// mentionee, and so on for as long as the two keep swipe-replying. One
// template for every hop after the first, since it's always the same
// shape ("X replied: you said / their reply") regardless of which of the
// two parties is being forwarded to this time — see
// findPendingMentionNotification/sendMentionReplyViaWhatsApp below and the
// README.
export const MENTION_REPLY_TEMPLATE_NAME = "mention_reply_notification";
const MENTION_REPLY_TEMPLATE_LANGUAGE = "en";

// Long enough to give real context, short of Meta's per-parameter limit —
// multi-line notes/descriptions (and WhatsApp replies) are also collapsed
// to one line, since a literal line break reads oddly jammed into one
// quoted template sentence.
const MENTION_EXCERPT_MAX_LENGTH = 200;

export function mentionExcerpt(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > MENTION_EXCERPT_MAX_LENGTH
    ? `${collapsed.slice(0, MENTION_EXCERPT_MAX_LENGTH - 1)}…`
    : collapsed;
}

// Fires alongside (never instead of) the in-app Notification rows callers
// already create for an @mention — this only reaches whichever of those
// mentioned users has also opted in a number from Settings → Team. Every
// failure mode here (WhatsApp not connected, a user has no number, the
// template isn't approved yet) is swallowed rather than thrown: a WhatsApp
// notification is a bonus on top of the in-app one, never a reason to fail
// the note/task save that triggered it.
export async function notifyMentionsViaWhatsApp(
  userIds: string[],
  mentioner: { id: string; name: string },
  message: string,
  path: string,
  entityRefs: ActivityEntityRefs,
): Promise<void> {
  if (userIds.length === 0) return;
  const account = await db.whatsAppAccount.findUnique({ where: { id: WHATSAPP_ACCOUNT_ID } });
  if (!account) return;

  const users = await db.user.findMany({
    where: { id: { in: userIds }, phone: { not: null } },
    select: { id: true, name: true, phone: true },
  });
  if (users.length === 0) return;

  const excerpt = mentionExcerpt(message);
  // Sent as a third plain body variable, not a button — WhatsApp renders any
  // URL inside body text as tappable client-side, no button component
  // needed, and this is what the template actually approved in Meta
  // Business Manager expects (see the README).
  const link = `${await getSiteOrigin()}${path}`;
  await Promise.all(
    users.map(async (user) => {
      try {
        const wamid = await sendWhatsAppTemplateMessage(
          account,
          user.phone!,
          MENTION_TEMPLATE_NAME,
          MENTION_TEMPLATE_LANGUAGE,
          [mentioner.name, excerpt, link],
        );
        // Lets a later swipe-to-reply on this exact message be matched back
        // here (via WhatsApp's "context.id" on the inbound webhook payload)
        // and forwarded on to the mentioner — see the webhook route.
        await db.whatsAppMentionNotification.create({
          data: { wamid, recipientId: user.id, forwardToId: mentioner.id, excerpt, ...entityRefs },
        });
      } catch (error) {
        console.error(
          `Mention WhatsApp notification failed for user ${user.id}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }),
  );
}

// Looks up which sent mention/reply notification (if any) an inbound
// WhatsApp message is swipe-replying to, by the wamid WhatsApp echoes back
// as `context.id` on the webhook payload. Returns null for anything else —
// a reply to some other message, or a fresh message with no quote at all.
export async function findPendingMentionNotification(wamid: string) {
  return db.whatsAppMentionNotification.findUnique({
    where: { wamid },
    include: {
      recipient: { select: { id: true, name: true, phone: true } },
      forwardTo: { select: { id: true, name: true, phone: true } },
    },
  });
}

type PendingMentionNotification = NonNullable<Awaited<ReturnType<typeof findPendingMentionNotification>>>;

// Forwards whichever of the two parties (mentioner/mentionee) just
// swipe-replied on to the other one, quoting both what's being replied to
// and the new reply itself. Returns the new message's wamid so the caller
// can track it for the *next* possible reply — see handleMentionReply in
// the webhook route, which is what keeps the chain going indefinitely
// instead of stopping after one round trip. Returns null (rather than
// throwing) when the other party never set their own number — the caller
// still logs the reply in the CRM either way, this is only the
// WhatsApp-side half of that.
export async function sendMentionReplyViaWhatsApp(
  account: WhatsAppAccount,
  pending: PendingMentionNotification,
  replyText: string,
): Promise<string | null> {
  if (!pending.forwardTo.phone) return null;
  const path = notificationHref({ taskId: null, activity: pending });
  const link = path ? `${await getSiteOrigin()}${path}` : await getSiteOrigin();
  return sendWhatsAppTemplateMessage(account, pending.forwardTo.phone, MENTION_REPLY_TEMPLATE_NAME, MENTION_REPLY_TEMPLATE_LANGUAGE, [
    pending.recipient.name,
    pending.excerpt,
    mentionExcerpt(replyText),
    link,
  ]);
}

// Must match an approved template in Meta Business Manager exactly — see
// the README's WhatsApp section for the exact text to submit. A template,
// not plain text, for the same reason as mention_notification above:
// whoever assigned the task is very unlikely to be within the assignee's
// own 24h WhatsApp reply window.
export const TASK_ASSIGNMENT_TEMPLATE_NAME = "task_assignment_notification";
const TASK_ASSIGNMENT_TEMPLATE_LANGUAGE = "en";

// Fires alongside (never instead of) the in-app Notification rows callers
// already create when a task gets a new assignee — this only reaches
// whichever of those assignees has also opted in a number from Settings →
// Team. Every failure mode here (WhatsApp not connected, a user has no
// number, the template isn't approved yet) is swallowed rather than thrown:
// a WhatsApp notification is a bonus on top of the in-app one, never a
// reason to fail the task save that triggered it.
export async function notifyTaskAssignmentViaWhatsApp(
  userIds: string[],
  assignerName: string,
  taskTitle: string,
  path: string,
): Promise<void> {
  if (userIds.length === 0) return;
  const account = await db.whatsAppAccount.findUnique({ where: { id: WHATSAPP_ACCOUNT_ID } });
  if (!account) return;

  const users = await db.user.findMany({
    where: { id: { in: userIds }, phone: { not: null } },
    select: { id: true, phone: true },
  });
  if (users.length === 0) return;

  const link = `${await getSiteOrigin()}${path}`;
  await Promise.all(
    users.map((user) =>
      sendWhatsAppTemplateMessage(
        account,
        user.phone!,
        TASK_ASSIGNMENT_TEMPLATE_NAME,
        TASK_ASSIGNMENT_TEMPLATE_LANGUAGE,
        [assignerName, taskTitle, link],
      ).catch((error) => {
        console.error(
          `Task assignment WhatsApp notification failed for user ${user.id}:`,
          error instanceof Error ? error.message : error,
        );
      }),
    ),
  );
}

// Must match an approved template in Meta Business Manager exactly — see
// the README's WhatsApp section for the exact text to submit. A template,
// not plain text, for the same reason as the other proactive notifications
// above: whoever changed the task's status is very unlikely to be within a
// follower's own 24h WhatsApp reply window.
export const TASK_STATUS_TEMPLATE_NAME = "task_status_notification";
const TASK_STATUS_TEMPLATE_LANGUAGE = "en";

// Fires alongside (never instead of) the in-app Notification rows callers
// already create when a followed task's completion status changes — this
// only reaches whichever of those followers has also opted in a number
// from Settings → Team. Every failure mode here is swallowed rather than
// thrown, same reasoning as the other WhatsApp notification helpers above.
export async function notifyTaskStatusViaWhatsApp(
  userIds: string[],
  actorName: string,
  taskTitle: string,
  statusText: string,
  path: string,
): Promise<void> {
  if (userIds.length === 0) return;
  const account = await db.whatsAppAccount.findUnique({ where: { id: WHATSAPP_ACCOUNT_ID } });
  if (!account) return;

  const users = await db.user.findMany({
    where: { id: { in: userIds }, phone: { not: null } },
    select: { id: true, phone: true },
  });
  if (users.length === 0) return;

  const link = `${await getSiteOrigin()}${path}`;
  await Promise.all(
    users.map((user) =>
      sendWhatsAppTemplateMessage(account, user.phone!, TASK_STATUS_TEMPLATE_NAME, TASK_STATUS_TEMPLATE_LANGUAGE, [
        actorName,
        taskTitle,
        statusText,
        link,
      ]).catch((error) => {
        console.error(
          `Task status WhatsApp notification failed for user ${user.id}:`,
          error instanceof Error ? error.message : error,
        );
      }),
    ),
  );
}
