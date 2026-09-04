import { db } from "@/lib/db";

export type CompanyOption = { id: string; name: string };

// Free/personal email providers — a contact's address at one of these says
// nothing about their employer's actual domain, so deriveCompanyDomain
// below refuses to guess from them rather than filling a company's domain
// with "gmail.com".
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "mail.com",
  "gmx.com",
  "163.com",
  "126.com",
  "qq.com",
]);

// A contact's own email domain is a reasonable stand-in for their
// employer's website when nothing else says otherwise (business card scan,
// vCard import) — but only for a domain that actually looks like a
// business one, not a free/personal provider.
export function deriveCompanyDomain(email: string): string | null {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain || !domain.includes(".")) return null;
  if (FREE_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}

// Strips a printed/typed website down to a bare domain — "https://www.acme.com/contact"
// or "www.Acme.com" both become "acme.com" — so it stores the same shape
// deriveCompanyDomain above produces from an email address.
export function normalizeDomain(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutProtocol = trimmed.replace(/^[a-z]+:\/\//i, "");
  const host = withoutProtocol.split(/[/?#]/)[0].replace(/^www\./i, "").toLowerCase();
  return host.includes(".") ? host : null;
}

export type CompanyHints = { domain?: string | null; phone?: string | null; address?: string | null };

// Case-sensitive exact match against MySQL's default ci (case-insensitive)
// collation, same as the bulk CSV import's lookup — matches "Acme Inc." and
// "acme inc." as the same company rather than creating a duplicate. Returns
// the resolved id *and* name (the existing row's stored name when matched,
// which may differ in casing from the input) so a caller whose UI already
// has a company list can merge a freshly-created company into it without a
// round trip back to the server.
//
// `hints` are only ever used to *fill a blank* — domain/phone/address the
// company doesn't have yet — never to overwrite something already there,
// same policy the CSV bulk importer already follows for industry/address.
// A brand-new company is created with whichever hints came in; an existing
// one only gets whatever fields it's still missing.
export async function findOrCreateCompanyByName(name: string, hints: CompanyHints = {}): Promise<CompanyOption | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const domain = hints.domain?.trim() || null;
  const phone = hints.phone?.trim() || null;
  const address = hints.address?.trim() || null;

  const existing = await db.company.findFirst({
    where: { name: trimmed },
    select: { id: true, name: true, domain: true, phone: true, address: true },
  });
  if (existing) {
    const fill: { domain?: string; phone?: string; address?: string } = {};
    if (!existing.domain && domain) fill.domain = domain;
    if (!existing.phone && phone) fill.phone = phone;
    if (!existing.address && address) fill.address = address;
    if (Object.keys(fill).length > 0) {
      await db.company.update({ where: { id: existing.id }, data: fill });
    }
    return { id: existing.id, name: existing.name };
  }

  return db.company.create({
    data: { name: trimmed, domain, phone, address },
    select: { id: true, name: true },
  });
}
