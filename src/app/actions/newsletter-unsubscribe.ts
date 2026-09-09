"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { withFlash } from "@/lib/utils";

// Public — reachable from the unsubscribe link in every newsletter send, no
// session involved (see src/app/unsubscribe/[token]/page.tsx, which is why
// it's allowlisted in src/proxy.ts). A token that doesn't match anything
// (already used, or just wrong) silently no-ops rather than erroring — the
// visitor's intent ("stop emailing me") is already satisfied if they're not
// a recipient of anything, and there's nothing useful to tell a stranger
// probing a dead link either way.
export async function confirmUnsubscribe(token: string, formData: FormData) {
  void formData;
  const recipient = await db.newsletterRecipient.findUnique({
    where: { unsubscribeToken: token },
    select: { contactId: true },
  });
  if (recipient) {
    await db.contact.update({
      where: { id: recipient.contactId },
      data: { emailOptOut: true, emailOptOutAt: new Date() },
    });
  }
  redirect(withFlash(`/unsubscribe/${token}`, "You're unsubscribed."));
}

// The one place emailOptOut can go back to false — it's never cleared
// automatically (a fresh newsletter send doesn't "re-subscribe" anyone),
// so an admin correcting a mistaken or outdated unsubscribe does it here,
// from the Contact page.
export async function setContactEmailOptOut(contactId: string, optOut: boolean, formData: FormData) {
  void formData;
  await requireAdminAction();
  await db.contact.update({
    where: { id: contactId },
    data: { emailOptOut: optOut, emailOptOutAt: optOut ? new Date() : null },
  });
  revalidatePath(`/system/contacts/${contactId}`);
}
