"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { findUnambiguousOpenDeal } from "@/lib/email";
import {
  WHATSAPP_ACCOUNT_ID,
  WHATSAPP_SENT_PREFIX,
  MAX_MEDIA_BYTES,
  WHATSAPP_MEDIA_KIND_TO_TYPE,
  sendWhatsAppMessage,
  sendWhatsAppMediaMessage,
  type WhatsAppMediaKind,
  type WhatsAppThreadMedia,
} from "@/lib/whatsapp";

const sendSchema = z.object({
  message: z.string().trim(),
  // Set only when sending from a Task's own detail page, so the logged
  // activity shows up in that task's activity log too, alongside the
  // contact's — see the taskId comment on the Activity model.
  taskId: z.string().trim().nullish(),
});

// Meta's own supported set per media type (not this app's choice to widen —
// anything outside this list, WhatsApp itself would reject on send). Image
// is deliberately narrower than "image/*": WhatsApp media messages only
// accept JPEG/PNG (GIF/WebP are supported for stickers, a different message
// type this app doesn't send).
const MIME_TYPES_BY_KIND: Record<WhatsAppMediaKind, Set<string>> = {
  image: new Set(["image/jpeg", "image/png"]),
  video: new Set(["video/mp4", "video/3gpp"]),
  document: new Set([
    "text/plain",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ]),
};

function classifyAttachment(mimeType: string): WhatsAppMediaKind | null {
  for (const kind of Object.keys(MIME_TYPES_BY_KIND) as WhatsAppMediaKind[]) {
    if (MIME_TYPES_BY_KIND[kind].has(mimeType)) return kind;
  }
  return null;
}

const MEDIA_LABEL: Record<WhatsAppMediaKind, string> = { image: "an image", video: "a video", document: "a document" };

export type SendWhatsAppFormState =
  | { error: string }
  // Echoes back the created message so the thread view can append it to its
  // own state immediately, rather than waiting for the next poll tick to
  // pick it up — your own sent message should never feel delayed.
  | { success: true; message: { id: string; text: string; createdAt: string; media: WhatsAppThreadMedia | null } }
  | undefined;

export async function sendWhatsAppToContact(
  contactId: string,
  _prevState: SendWhatsAppFormState,
  formData: FormData,
): Promise<SendWhatsAppFormState> {
  const parsed = sendSchema.safeParse({
    message: formData.get("message"),
    taskId: formData.get("taskId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid message" };
  }

  const rawAttachment = formData.get("attachment");
  const attachment = rawAttachment instanceof File && rawAttachment.size > 0 ? rawAttachment : null;
  if (!attachment && !parsed.data.message) {
    return { error: "Write a message or attach a file." };
  }

  let kind: WhatsAppMediaKind | null = null;
  if (attachment) {
    kind = classifyAttachment(attachment.type);
    if (!kind) {
      return { error: "Unsupported file type — WhatsApp only accepts JPEG/PNG images, MP4/3GPP video, or PDF/Word/Excel/PowerPoint/text documents." };
    }
    if (attachment.size > MAX_MEDIA_BYTES[kind]) {
      return { error: `That ${kind} is too large — the limit is ${Math.floor(MAX_MEDIA_BYTES[kind] / (1024 * 1024))}MB.` };
    }
  }

  const [, contact, account] = await Promise.all([
    requireAdminAction(),
    db.contact.findUniqueOrThrow({ where: { id: contactId }, select: { phone: true } }),
    db.whatsAppAccount.findUnique({ where: { id: WHATSAPP_ACCOUNT_ID } }),
  ]);
  if (!contact.phone) {
    return { error: "This contact has no phone number on file." };
  }
  if (!account) {
    return { error: "Connect WhatsApp Business in Settings before sending." };
  }

  // Set together, only when there's a validated attachment — everything
  // downstream branches on this one value rather than re-checking
  // attachment/kind separately.
  const media = attachment && kind ? { kind, mimeType: attachment.type, name: attachment.name } : null;

  let messageId: string;
  let buffer: Buffer | null = null;
  try {
    if (media && attachment) {
      buffer = Buffer.from(await attachment.arrayBuffer());
      messageId = await sendWhatsAppMediaMessage(account, contact.phone, media.kind, buffer, media.mimeType, {
        caption: parsed.data.message || undefined,
        filename: media.name,
      });
    } else {
      messageId = await sendWhatsAppMessage(account, contact.phone, parsed.data.message);
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't send, try again" };
  }

  const displayText = parsed.data.message || (media ? `Sent ${MEDIA_LABEL[media.kind]}` : "");
  const dealId = await findUnambiguousOpenDeal(contactId);
  const activity = await db.activity.create({
    data: {
      type: "WHATSAPP",
      content: `${WHATSAPP_SENT_PREFIX}${displayText}`,
      contactId,
      dealId,
      taskId: parsed.data.taskId || null,
      // Same "whatsapp:<wamid>" key inbound messages dedup on below — wamids
      // are unique regardless of direction, so this doubles as the lookup
      // key the webhook's `statuses` events match against to update
      // whatsappStatus as Meta reports sent -> delivered -> read.
      externalId: `whatsapp:${messageId}`,
      whatsappStatus: "SENT",
      ...(media && buffer
        ? {
            whatsappMediaType: WHATSAPP_MEDIA_KIND_TO_TYPE[media.kind],
            whatsappMediaMimeType: media.mimeType,
            whatsappMediaName: media.kind === "document" ? media.name : null,
            whatsappMediaData: buffer.toString("base64"),
          }
        : {}),
    },
  });

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/whatsapp/${contactId}`);
  revalidatePath("/whatsapp");
  if (dealId) revalidatePath(`/deals/${dealId}`);
  if (parsed.data.taskId) revalidatePath(`/tasks/${parsed.data.taskId}`);
  return {
    success: true,
    message: {
      id: activity.id,
      text: displayText,
      createdAt: activity.createdAt.toISOString(),
      media: media
        ? {
            type: WHATSAPP_MEDIA_KIND_TO_TYPE[media.kind],
            url: `/api/whatsapp/media/${activity.id}`,
            mimeType: media.mimeType,
            name: media.kind === "document" ? media.name : null,
          }
        : null,
    },
  };
}

// Fire-and-forget from the thread view (see WhatsAppThread) whenever it's
// opened or a new message arrives while it's open. Team-wide, not per-user —
// see Contact.whatsappLastReadAt.
export async function markWhatsAppThreadRead(contactId: string): Promise<void> {
  await requireAdminAction();
  await db.contact.update({ where: { id: contactId }, data: { whatsappLastReadAt: new Date() } });
}
