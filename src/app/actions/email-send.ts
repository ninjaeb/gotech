"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { sendEmailViaAccount, findUnambiguousOpenDeal } from "@/lib/email";

const sendSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required"),
  body: z.string().trim().min(1, "Message is required"),
});

export type SendEmailFormState = { error: string } | { success: true } | undefined;

export async function sendEmailToContact(
  contactId: string,
  _prevState: SendEmailFormState,
  formData: FormData,
): Promise<SendEmailFormState> {
  const parsed = sendSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid message" };
  }

  const [user, contact] = await Promise.all([
    getCurrentUser(),
    db.contact.findUniqueOrThrow({ where: { id: contactId }, select: { email: true } }),
  ]);
  if (!contact.email) {
    return { error: "This contact has no email address on file." };
  }

  const account = await db.emailAccount.findUnique({ where: { userId: user.id } });
  if (!account) {
    return { error: "Connect your email in Settings before sending." };
  }

  try {
    await sendEmailViaAccount(account, { to: contact.email, subject: parsed.data.subject, text: parsed.data.body });
  } catch (error) {
    return { error: `Couldn't send: ${error instanceof Error ? error.message : "try again"}` };
  }

  const dealId = await findUnambiguousOpenDeal(contactId);
  await db.activity.create({
    data: {
      type: "EMAIL",
      content: `Sent email — "${parsed.data.subject}": ${parsed.data.body}`,
      contactId,
      dealId,
    },
  });

  revalidatePath(`/contacts/${contactId}`);
  if (dealId) revalidatePath(`/deals/${dealId}`);
  return { success: true };
}
