import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/email-crypto";
import { findUnambiguousOpenDeal } from "@/lib/email";
import {
  WHATSAPP_ACCOUNT_ID,
  WHATSAPP_RECEIVED_PREFIX,
  findContactIdByWhatsAppPhone,
  findPendingMentionNotification,
  sendMentionReplyViaWhatsApp,
  verifyWebhookSignature,
  downloadWhatsAppMedia,
} from "@/lib/whatsapp";
import type { WhatsAppAccount, WhatsAppMediaType } from "@/generated/prisma/client";

// Meta's one-time handshake when the webhook URL is registered/re-verified
// in the Meta App Dashboard: echo back hub.challenge if hub.verify_token
// matches what we generated and the user pasted in there. See
// src/lib/whatsapp.ts and README's WhatsApp Business setup section.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const account = await db.whatsAppAccount.findUnique({ where: { id: WHATSAPP_ACCOUNT_ID } });
  if (mode === "subscribe" && account && token === account.webhookVerifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type WhatsAppMediaPayload = { id: string; mime_type?: string; caption?: string; filename?: string };

type WhatsAppTextMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: WhatsAppMediaPayload;
  document?: WhatsAppMediaPayload;
  video?: WhatsAppMediaPayload;
  // Present when this message is a swipe-to-reply/quote of an earlier one —
  // `id` there is that earlier message's own wamid. Used to detect a reply
  // to a mention notification; see handleMentionReply below.
  context?: { id: string };
};

// Meta's message-delivery lifecycle events — one per status hop (a single
// outbound message gets a "sent" event, then later a separate "delivered"
// event, then "read", each a fresh POST). `id` is the same wamid the
// "messages" send path stored as externalId, which is how these get matched
// back to the Activity row that logged the send.
type WhatsAppStatusUpdate = {
  id: string;
  status: string;
  timestamp: string;
};

type WhatsAppWebhookPayload = {
  entry?: {
    changes?: {
      value?: { messages?: WhatsAppTextMessage[]; statuses?: WhatsAppStatusUpdate[] };
    }[];
  }[];
};

const KNOWN_STATUSES = new Set(["sent", "delivered", "read", "failed"]);

function toWhatsAppMessageStatus(status: string): "SENT" | "DELIVERED" | "READ" | "FAILED" | null {
  return KNOWN_STATUSES.has(status) ? (status.toUpperCase() as "SENT" | "DELIVERED" | "READ" | "FAILED") : null;
}

// A non-text, non-media message (location, voice note, contact card,
// etc.) — this app doesn't download/store those, so it logs a marker
// instead of the content, same spirit as skipping an email attachment's
// bytes while still logging that the email arrived. Image/document/video
// get real handling instead — see buildInboundMediaContent below.
function describeMessage(message: WhatsAppTextMessage): string {
  if (message.type === "text" && message.text?.body) return message.text.body;
  return `[${message.type} message — open WhatsApp to view]`;
}

const MEDIA_LABEL: Record<"IMAGE" | "DOCUMENT" | "VIDEO", string> = {
  IMAGE: "Sent an image",
  DOCUMENT: "Sent a document",
  VIDEO: "Sent a video",
};

type InboundMedia = {
  type: WhatsAppMediaType;
  mimeType: string;
  name: string | null;
  data: string;
};

// Downloads and stores an inbound image/document/video from a Contact
// conversation so it displays inline in the thread — unlike a mention
// reply (see handleMentionReply), a customer conversation is worth the
// extra round trip. Returns null on download failure (falls back to the
// same placeholder text describeMessage would give a message this app
// can't otherwise render) or when the message isn't media at all.
async function buildInboundMediaContent(
  account: WhatsAppAccount,
  message: WhatsAppTextMessage,
): Promise<{ content: string; media: InboundMedia | null } | null> {
  const payload = message.image ?? message.document ?? message.video;
  if (!payload) return null;

  const downloaded = await downloadWhatsAppMedia(account, payload.id);
  if (!downloaded) {
    return { content: `[${message.type} message — open WhatsApp to view]`, media: null };
  }
  const type: WhatsAppMediaType = message.image ? "IMAGE" : message.video ? "VIDEO" : "DOCUMENT";
  return {
    content: payload.caption?.trim() || MEDIA_LABEL[type],
    media: { type, mimeType: downloaded.mimeType, name: payload.filename ?? null, data: downloaded.buffer.toString("base64") },
  };
}

// A swipe-reply to a mention notification: forwards it on to whoever did
// the mentioning (best-effort — logged either way even if that fails, e.g.
// they never set their own number) and logs it as an Activity + bell
// Notification on the same entity the original mention was about, so it
// shows up in the CRM even for people who weren't on either end of the
// WhatsApp exchange. Never touches Contact-conversation logging — this is
// a reply between two internal Users, not a customer conversation.
async function handleMentionReply(
  account: WhatsAppAccount,
  pending: NonNullable<Awaited<ReturnType<typeof findPendingMentionNotification>>>,
  message: WhatsAppTextMessage,
): Promise<void> {
  const replyText = describeMessage(message);

  try {
    await sendMentionReplyViaWhatsApp(account, pending, replyText);
  } catch (error) {
    console.error(
      `Forwarding mention reply to ${pending.mentioner.name} failed:`,
      error instanceof Error ? error.message : error,
    );
  }

  try {
    const activity = await db.activity.create({
      data: {
        type: "WHATSAPP",
        content: `${pending.mentioneeName} replied via WhatsApp to ${pending.mentioner.name}'s mention: "${replyText}"`,
        contactId: pending.contactId,
        companyId: pending.companyId,
        dealId: pending.dealId,
        projectId: pending.projectId,
        taskId: pending.taskId,
        externalId: `whatsapp:${message.id}`,
        createdAt: new Date(Number(message.timestamp) * 1000),
      },
    });
    await db.notification.create({
      data: {
        userId: pending.mentionerId,
        activityId: activity.id,
        content: `${pending.mentioneeName} replied to your mention on WhatsApp`,
      },
    });
  } catch (error) {
    // P2002 = unique constraint violation on externalId — already logged
    // (Meta can redeliver the same webhook event).
    if (!(error instanceof Object && "code" in error && error.code === "P2002")) throw error;
  }
}

// Meta delivers every inbound message and status update (sent/delivered/
// read receipts) here. `messages` and `statuses` entries are both actioned;
// anything else (e.g. account-review events) is acknowledged and ignored.
// Must always return 2xx quickly — Meta retries (and eventually disables)
// a webhook that doesn't.
export async function POST(request: NextRequest) {
  const account = await db.whatsAppAccount.findUnique({ where: { id: WHATSAPP_ACCOUNT_ID } });
  if (!account) return NextResponse.json({ ok: true });

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = decryptSecret(account.encryptedAppSecret);
  if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = (payload.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => change.value?.messages ?? []),
  );

  for (const message of messages) {
    if (message.context?.id) {
      const pending = await findPendingMentionNotification(message.context.id);
      if (pending) {
        await handleMentionReply(account, pending, message);
        continue;
      }
    }

    const contactId = await findContactIdByWhatsAppPhone(message.from);
    if (!contactId) continue;

    const dealId = await findUnambiguousOpenDeal(contactId);
    const inboundMedia = await buildInboundMediaContent(account, message);
    try {
      await db.activity.create({
        data: {
          type: "WHATSAPP",
          content: `${WHATSAPP_RECEIVED_PREFIX}${inboundMedia?.content ?? describeMessage(message)}`,
          contactId,
          dealId,
          externalId: `whatsapp:${message.id}`,
          createdAt: new Date(Number(message.timestamp) * 1000),
          ...(inboundMedia?.media
            ? {
                whatsappMediaType: inboundMedia.media.type,
                whatsappMediaMimeType: inboundMedia.media.mimeType,
                whatsappMediaName: inboundMedia.media.name,
                whatsappMediaData: inboundMedia.media.data,
              }
            : {}),
        },
      });
    } catch (error) {
      // P2002 = unique constraint violation on externalId — already logged
      // (Meta can redeliver the same webhook event).
      if (!(error instanceof Object && "code" in error && error.code === "P2002")) throw error;
    }
  }

  const statuses = (payload.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => change.value?.statuses ?? []),
  );

  for (const status of statuses) {
    const mapped = toWhatsAppMessageStatus(status.status);
    if (!mapped) continue;
    // updateMany, not update — a status event can in principle be redelivered
    // or (rarely) arrive before the send's own Activity.create has committed;
    // either way there's nothing to throw about, just nothing to update yet.
    await db.activity.updateMany({
      where: { externalId: `whatsapp:${status.id}` },
      data: { whatsappStatus: mapped },
    });
  }

  return NextResponse.json({ ok: true });
}
