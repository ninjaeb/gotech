import { db } from "@/lib/db";
import { splitFullName } from "@/lib/format";
import type { LifecycleStage } from "@/generated/prisma/client";

// Shared by every public, unauthenticated entry point that turns a name +
// email into a Contact (lead capture, booking) — reuses an existing Contact
// by email instead of creating a duplicate every time the same person
// submits again, and never overwrites a company a rep has already set.
export async function findOrCreateContactByEmail({
  name,
  email,
  phone,
  companyId,
  lifecycleStage,
}: {
  name: string;
  email: string;
  phone?: string | null;
  companyId?: string | null;
  // Only applied when a brand-new contact is created — an existing contact
  // matched by email keeps whatever classification (or lack of one) it
  // already had, since filling out one more form isn't proof of their stage.
  lifecycleStage?: LifecycleStage;
}) {
  const existing = await db.contact.findFirst({
    where: { email },
    select: { id: true, companyId: true },
  });
  if (existing) {
    if (existing.companyId || !companyId) return existing;
    return db.contact.update({
      where: { id: existing.id },
      data: { companyId },
      select: { id: true, companyId: true },
    });
  }

  const { firstName, lastName } = splitFullName(name);
  return db.contact.create({
    data: {
      firstName: firstName || name,
      lastName: lastName || null,
      email,
      phone: phone || null,
      companyId: companyId ?? null,
      lifecycleStage: lifecycleStage ?? null,
    },
    select: { id: true, companyId: true },
  });
}
