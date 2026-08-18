"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

const INVITE_EXPIRY_DAYS = 7;

export async function inviteToPortal(contactId: string) {
  const contact = await db.contact.findUniqueOrThrow({
    where: { id: contactId },
    select: { email: true, companyId: true },
  });
  if (!contact.companyId) {
    throw new Error("Link this contact to a company before inviting them to the portal.");
  }
  if (!contact.email) {
    throw new Error("This contact needs an email address before inviting them to the portal.");
  }

  const inviteToken = randomBytes(24).toString("base64url");
  const inviteTokenExpiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.clientUser.upsert({
    where: { contactId },
    update: { email: contact.email, inviteToken, inviteTokenExpiresAt },
    create: { contactId, email: contact.email, inviteToken, inviteTokenExpiresAt },
  });

  revalidatePath(`/contacts/${contactId}`);
}

export async function revokePortalAccess(contactId: string, formData: FormData) {
  void formData;
  await db.clientUser.deleteMany({ where: { contactId } });
  revalidatePath(`/contacts/${contactId}`);
}
