import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { findOrCreateContactByEmail } from "@/lib/contact-matching";
import { getNewsletterSubscribeListId } from "@/lib/settings";
import { isValidPhoneFormat, normalizePhone } from "@/lib/phone";

// Zod's "message" here is a semantic CODE, not display text — shared by the
// hosted /subscribe page's Server Action and the embeddable widget's public
// API route, same pattern as leads.ts's leadSchema/LeadFormErrorCode.
export type NewsletterSubscribeErrorCode =
  | "name_required"
  | "email_required"
  | "email_invalid"
  | "phone_required"
  | "phone_invalid"
  | "channel_invalid"
  | "rate_limited"
  | "invalid_submission"
  | "not_configured"
  | "generic";

// Which channel(s) this submission opts into — drives which consent flag(s)
// subscribeToNewsletter below sets. Every field is required regardless of
// channel: a WhatsApp-only subscriber still gets an email Contact record
// (findOrCreateContactByEmail is keyed on email), and an email-only
// subscriber's phone is captured in case they later add WhatsApp from the
// contact detail page.
export const newsletterSubscribeChannelSchema = z.enum(["EMAIL", "WHATSAPP", "BOTH"], {
  message: "channel_invalid",
});

export const newsletterSubscribeSchema = z.object({
  name: z.string().trim().min(1, "name_required"),
  email: z.string().trim().min(1, "email_required").email("email_invalid"),
  phone: z
    .string()
    .trim()
    .min(1, "phone_required")
    .refine(isValidPhoneFormat, { message: "phone_invalid" }),
  channel: newsletterSubscribeChannelSchema,
});

export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;
export type SubscribeResult = { ok: true } | { ok: false; code: NewsletterSubscribeErrorCode };

// Shared by every entry point that turns a subscribe-form submission into a
// newsletter recipient — the hosted /subscribe page (same-origin form post)
// and the embeddable widget's public API route (cross-origin JSON post)
// both call this.
export async function subscribeToNewsletter(data: NewsletterSubscribeInput): Promise<SubscribeResult> {
  const listId = await getNewsletterSubscribeListId();
  if (!listId) {
    return { ok: false, code: "not_configured" };
  }

  const contact = await findOrCreateContactByEmail({
    name: data.name,
    email: data.email,
    phone: normalizePhone(data.phone),
    lifecycleStage: "SUBSCRIBER",
  });

  const wantsEmail = data.channel === "EMAIL" || data.channel === "BOTH";
  const wantsWhatsApp = data.channel === "WHATSAPP" || data.channel === "BOTH";

  // Submitting this form is an explicit, current opt-in for whichever
  // channel(s) were chosen — clears a previous unsubscribe on that channel
  // (Contact.emailOptOut / whatsappMarketingOptIn) the same way resubscribing
  // to any mailing list would. Only the chosen channel's flag is touched: an
  // EMAIL-only submission shouldn't silently opt a contact into WhatsApp
  // marketing, or override one it had previously said no to.
  await db.contact.update({
    where: { id: contact.id },
    data: {
      ...(wantsEmail ? { emailOptOut: false, emailOptOutAt: null } : {}),
      ...(wantsWhatsApp ? { whatsappMarketingOptIn: true, whatsappMarketingOptInAt: new Date() } : {}),
    },
  });

  await db.contactListMember.createMany({
    data: [{ listId, contactId: contact.id }],
    skipDuplicates: true,
  });

  revalidatePath("/contacts");
  revalidatePath(`/lists/${listId}`);

  return { ok: true };
}
