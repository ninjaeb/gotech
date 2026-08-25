import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/email-crypto";
import { findUnambiguousOpenDeal } from "@/lib/email";
import { WHATSAPP_ACCOUNT_ID, findContactIdByWhatsAppPhone, verifyWebhookSignature } from "@/lib/whatsapp";

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

type WhatsAppWebhookPayload = {
  entry?: {
    changes?: {
      value?: { messages?: WhatsAppTextMessage[] };
    }[];
  }[];
};

// A non-text message (image, document, location, voice note, etc.) — this
// app doesn't download/store WhatsApp media, so it logs a marker instead of
// the content, same spirit as skipping an email attachment's bytes while
// still logging that the email arrived.
function describeMessage(message: WhatsAppTextMessage): string {
  if (message.type === "text" && message.text?.body) return message.text.body;
  return `[${message.type} message — open WhatsApp to view]`;
}

// Meta delivers every inbound message and status update (sent/delivered/
// read receipts) here. Only `messages` entries are actioned; everything
// else is acknowledged and ignored. Must always return 2xx quickly —
// Meta retries (and eventually disables) a webhook that doesn't.
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
          content: `Received WhatsApp message: ${describeMessage(message)}`,
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

  return NextResponse.json({ ok: true });
}
