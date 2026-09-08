import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { findOrCreateContactByEmail } from "@/lib/contact-matching";
import { getNewsletterSubscribeListId } from "@/lib/settings";

// Zod's "message" here is a semantic CODE, not display text — shared by the
// hosted /subscribe page's Server Action and the embeddable widget's public
// API route, same pattern as leads.ts's leadSchema/LeadFormErrorCode.
export type NewsletterSubscribeErrorCode =
  | "name_required"
  | "email_required"
  | "email_invalid"
  | "rate_limited"
  | "invalid_submission"
  | "not_configured"
  | "generic";

export const newsletterSubscribeSchema = z.object({
  name: z.string().trim().min(1, "name_required"),
  email: z.string().trim().min(1, "email_required").email("email_invalid"),
  phone: z.string().trim().optional(),
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
    phone: data.phone?.trim() || null,
    lifecycleStage: "SUBSCRIBER",
  });

  await db.contact.update({
    where: { id: contact.id },
    // Submitting this form is an explicit, current opt-in — clears a
    // previous unsubscribe (see Contact.emailOptOut) the same way
    // resubscribing to any mailing list would, rather than leaving them
    // opted out despite just asking to be subscribed.
    data: { emailOptOut: false, emailOptOutAt: null },
  });

  await db.contactListMember.createMany({
    data: [{ listId, contactId: contact.id }],
    skipDuplicates: true,
  });

  revalidatePath("/contacts");
  revalidatePath(`/lists/${listId}`);

  return { ok: true };
}
