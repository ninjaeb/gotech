import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { findOrCreateContactByEmail } from "@/lib/contact-matching";
import { getNewsletterSubscribeListId } from "@/lib/settings";

// Zod's "message" here is a semantic CODE, not display text — shared by the
// hosted /subscribe page's Server Action and the embeddable widget's public
// API route, same pattern as leads.ts's leadSchema/LeadFormErrorCode.
export type NewsletterSubscribeErrorCode =
  | "email_required"
  | "email_invalid"
  | "rate_limited"
  | "invalid_submission"
  | "not_configured"
  | "generic";

export const newsletterSubscribeSchema = z.object({
  name: z.string().trim().optional(),
  email: z.string().trim().min(1, "email_required").email("email_invalid"),
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
    // A name field would be one more required box for what's meant to be a
    // one-field "just my email" form — falling back to the email itself
    // keeps the contact usably labeled even when nobody typed one.
    name: data.name?.trim() || data.email,
    email: data.email,
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
