"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { findUnambiguousOpenDeal } from "@/lib/email";
import { WHATSAPP_ACCOUNT_ID, WHATSAPP_SENT_PREFIX, sendWhatsAppMessage } from "@/lib/whatsapp";

const sendSchema = z.object({
  message: z.string().trim().min(1, "Message is required"),
  // Set only when sending from a Task's own detail page, so the logged
  // activity shows up in that task's activity log too, alongside the
  // contact's — see the taskId comment on the Activity model.
  taskId: z.string().trim().nullish(),
});

export type SendWhatsAppFormState =
  | { error: string }
  // Echoes back the created message so the thread view can append it to its
  // own state immediately, rather than waiting for the next poll tick to
  // pick it up — your own sent message should never feel delayed.
  | { success: true; message: { id: string; text: string; createdAt: string } }
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

  let messageId: string;
  try {
    messageId = await sendWhatsAppMessage(account, contact.phone, parsed.data.message);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't send, try again" };
  }

  const dealId = await findUnambiguousOpenDeal(contactId);
  const activity = await db.activity.create({
    data: {
      type: "WHATSAPP",
      content: `${WHATSAPP_SENT_PREFIX}${parsed.data.message}`,
      contactId,
      dealId,
      taskId: parsed.data.taskId || null,
      // Same "whatsapp:<wamid>" key inbound messages dedup on below — wamids
      // are unique regardless of direction, so this doubles as the lookup
      // key the webhook's `statuses` events match against to update
      // whatsappStatus as Meta reports sent -> delivered -> read.
      externalId: `whatsapp:${messageId}`,
      whatsappStatus: "SENT",
    },
  });

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/whatsapp/${contactId}`);
  revalidatePath("/whatsapp");
  if (dealId) revalidatePath(`/deals/${dealId}`);
  if (parsed.data.taskId) revalidatePath(`/tasks/${parsed.data.taskId}`);
  return {
    success: true,
    message: { id: activity.id, text: parsed.data.message, createdAt: activity.createdAt.toISOString() },
  };
}

// Fire-and-forget from the thread view (see WhatsAppThread) whenever it's
// opened or a new message arrives while it's open. Team-wide, not per-user —
// see Contact.whatsappLastReadAt.
export async function markWhatsAppThreadRead(contactId: string): Promise<void> {
  await requireAdminAction();
  await db.contact.update({ where: { id: contactId }, data: { whatsappLastReadAt: new Date() } });
}
