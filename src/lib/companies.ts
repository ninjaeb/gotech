import { db } from "@/lib/db";

export type CompanyOption = { id: string; name: string };

// Case-sensitive exact match against MySQL's default ci (case-insensitive)
// collation, same as the bulk CSV import's lookup — matches "Acme Inc." and
// "acme inc." as the same company rather than creating a duplicate. Returns
// the resolved id *and* name (the existing row's stored name when matched,
// which may differ in casing from the input) so a caller whose UI already
// has a company list can merge a freshly-created company into it without a
// round trip back to the server.
export async function findOrCreateCompanyByName(name: string): Promise<CompanyOption | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const existing = await db.company.findFirst({ where: { name: trimmed }, select: { id: true, name: true } });
  if (existing) return existing;
  return db.company.create({ data: { name: trimmed }, select: { id: true, name: true } });
}
