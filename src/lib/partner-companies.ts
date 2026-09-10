import { db } from "@/lib/db";

export type PartnerCompanyOption = { id: string; name: string };
export type PartnerCompanyHints = { website?: string | null; phone?: string | null; address?: string | null };

// Same find-or-create-by-name convention as findOrCreateCompanyByName
// (src/lib/companies.ts), but scoped to one partner's own PartnerCompany
// rows rather than the system-wide Company table — a business card or
// vCard imported into the business portal should only ever match/create a
// company that partner can already see.
//
// `hints` only ever fill a blank — website/phone/address the company
// doesn't have yet — never overwrite something already there, same policy
// findOrCreateCompanyByName follows.
export async function findOrCreatePartnerCompanyByName(
  partnerId: string,
  name: string,
  hints: PartnerCompanyHints = {},
): Promise<PartnerCompanyOption | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const website = hints.website?.trim() || null;
  const phone = hints.phone?.trim() || null;
  const address = hints.address?.trim() || null;

  const existing = await db.partnerCompany.findFirst({
    where: { partnerId, name: trimmed },
    select: { id: true, name: true, website: true, phone: true, address: true },
  });
  if (existing) {
    const fill: { website?: string; phone?: string; address?: string } = {};
    if (!existing.website && website) fill.website = website;
    if (!existing.phone && phone) fill.phone = phone;
    if (!existing.address && address) fill.address = address;
    if (Object.keys(fill).length > 0) {
      await db.partnerCompany.update({ where: { id: existing.id }, data: fill });
    }
    return { id: existing.id, name: existing.name };
  }

  return db.partnerCompany.create({
    data: { name: trimmed, partnerId, website, phone, address },
    select: { id: true, name: true },
  });
}
