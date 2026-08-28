import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/email-crypto";
import { findUnambiguousOpenDeal } from "@/lib/email";
import {
  WHATSAPP_ACCOUNT_ID,
  WHATSAPP_RECEIVED_PREFIX,
  findContactIdByWhatsAppPhone,
  verifyWebhookSignature,
} from "@/lib/whatsapp";

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

type WhatsAppTextMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
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

// A non-text message (image, document, location, voice note, etc.) — this
// app doesn't download/store WhatsApp media, so it logs a marker instead of
// the content, same spirit as skipping an email attachment's bytes while
// still logging that the email arrived.
function describeMessage(message: WhatsAppTextMessage): string {
  if (message.type === "text" && message.text?.body) return message.text.body;
  return `[${message.type} message — open WhatsApp to view]`;
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
    const contactId = await findContactIdByWhatsAppPhone(message.from);
    if (!contactId) continue;

    const dealId = await findUnambiguousOpenDeal(contactId);
    try {
      await db.activity.create({
        data: {
          type: "WHATSAPP",
          content: `${WHATSAPP_RECEIVED_PREFIX}${describeMessage(message)}`,
          contactId,
          dealId,
          externalId: `whatsapp:${message.id}`,
          createdAt: new Date(Number(message.timestamp) * 1000),
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
