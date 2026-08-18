import { db } from "@/lib/db";
import { splitFullName } from "@/lib/format";

// Shared by every public, unauthenticated entry point that turns a name +
// email into a Contact (lead capture, booking) — reuses an existing Contact
// by email instead of creating a duplicate every time the same person
// submits again, and never overwrites a company a rep has already set.
export async function findOrCreateContactByEmail({
  name,
  email,
  phone,
  companyId,
}: {
  name: string;
  email: string;
  phone?: string | null;
  companyId?: string | null;
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
    },
    select: { id: true, companyId: true },
  });
}
