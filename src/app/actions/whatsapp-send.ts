"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { findUnambiguousOpenDeal } from "@/lib/email";
import { WHATSAPP_ACCOUNT_ID, sendWhatsAppMessage } from "@/lib/whatsapp";

const sendSchema = z.object({
  message: z.string().trim().min(1, "Message is required"),
});

export type SendWhatsAppFormState = { error: string } | { success: true } | undefined;

export async function sendWhatsAppToContact(
  contactId: string,
  _prevState: SendWhatsAppFormState,
  formData: FormData,
): Promise<SendWhatsAppFormState> {
  const parsed = sendSchema.safeParse({ message: formData.get("message") });
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

  try {
    await sendWhatsAppMessage(account, contact.phone, parsed.data.message);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't send, try again" };
  }

  const dealId = await findUnambiguousOpenDeal(contactId);
  await db.activity.create({
    data: {
      type: "WHATSAPP",
      content: `Sent WhatsApp message: ${parsed.data.message}`,
      contactId,
      dealId,
    },
  });

  revalidatePath(`/contacts/${contactId}`);
  if (dealId) revalidatePath(`/deals/${dealId}`);
  return { success: true };
}
