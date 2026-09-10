"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  parseContactImportFile,
  type ParsedContactRow,
} from "@/lib/contact-import-parsing";
import { requirePartnerAction } from "@/lib/auth/dal";
import { toTitleCase } from "@/lib/names";
import { phoneMatchKey } from "@/lib/phone";
import type { Industry } from "@/generated/prisma/client";

// Same CSV/Excel import flow as the system CRM's (src/app/actions/contact-import.ts),
// duplicated rather than shared because it reads/writes PartnerContact and
// PartnerCompany, scoped to one partner, rather than the system-wide
// Contact/Company tables — matching by email/phone must never cross
// between partners, and PartnerCompany has no `domain` field of its own
// (a parsed row's companyDomain is folded into `website` instead).
const MAX_FILE_SIZE = 5 * 1024 * 1024; // matches next.config.ts serverActions.bodySizeLimit
const MAX_ROWS = 5000;

export type ImportError = {
  status: "error";
  message: string;
};

export type ImportPreview = {
  status: "preview";
  fileName: string;
  rows: ParsedContactRow[];
  duplicateEmails: string[];
  // Match keys (phoneMatchKey — no "+", no separators), not raw numbers, so
  // "+60123456789" and "0123456789" are recognized as the same duplicate.
  duplicatePhones: string[];
  totalRows: number;
  importableRows: number;
  skippedRows: number;
};

export type ImportResult = {
  status: "done";
  created: number;
  updated: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  companiesCreated: number;
};

export async function previewPartnerContactImport(
  formData: FormData,
): Promise<ImportPreview | ImportError> {
  const partner = await requirePartnerAction();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a CSV or Excel file to import." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { status: "error", message: "That file is too large (max 5MB)." };
  }

  let parsed: Awaited<ReturnType<typeof parseContactImportFile>>;
  try {
    parsed = await parseContactImportFile(file);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not parse that file.",
    };
  }

  if (parsed.rows.length === 0) {
    return { status: "error", message: "No contacts found in that file." };
  }
  if (parsed.rows.length > MAX_ROWS) {
    return {
      status: "error",
      message: `That file has ${parsed.rows.length} rows — please split it into batches of ${MAX_ROWS} or fewer.`,
    };
  }

  const emails = parsed.rows
    .map((row) => row.email)
    .filter((email): email is string => Boolean(email));

  const existing = emails.length
    ? await db.partnerContact.findMany({
        where: { partnerId: partner.id, email: { in: emails } },
        select: { email: true },
      })
    : [];
  const existingEmails = new Set(
    existing.map((contact) => contact.email!.toLowerCase()),
  );

  const duplicateEmails = [
    ...new Set(
      parsed.rows
        .filter((row) => row.email && existingEmails.has(row.email.toLowerCase()))
        .map((row) => row.email as string),
    ),
  ];

  // Fetched wholesale rather than filtered to the file's numbers up front —
  // the match key isn't a column Prisma can filter on directly, so the
  // comparison has to happen in JS either way.
  const rowPhoneKeys = parsed.rows
    .map((row) => (row.phone ? phoneMatchKey(row.phone) : null))
    .filter((key): key is string => Boolean(key));
  const existingWithPhone = rowPhoneKeys.length
    ? await db.partnerContact.findMany({
        where: { partnerId: partner.id, phone: { not: null } },
        select: { phone: true },
      })
    : [];
  const existingPhoneKeys = new Set(
    existingWithPhone.map((contact) => phoneMatchKey(contact.phone!)),
  );
  const duplicatePhones = [...new Set(rowPhoneKeys.filter((key) => existingPhoneKeys.has(key)))];

  return {
    status: "preview",
    fileName: file.name,
    rows: parsed.rows,
    duplicateEmails,
    duplicatePhones,
    totalRows: parsed.rows.length,
    importableRows: parsed.rows.filter((row) => row.importable).length,
    skippedRows: parsed.rows.filter((row) => !row.importable).length,
  };
}

export async function confirmPartnerContactImport(
  formData: FormData,
): Promise<ImportResult | ImportError> {
  const partner = await requirePartnerAction();
  const rowsJson = formData.get("rows");
  if (typeof rowsJson !== "string") {
    return {
      status: "error",
      message: "Missing import data — please upload the file again.",
    };
  }

  let rows: ParsedContactRow[];
  try {
    const parsed: unknown = JSON.parse(rowsJson);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    rows = parsed as ParsedContactRow[];
  } catch {
    return {
      status: "error",
      message: "Import data was corrupted — please upload the file again.",
    };
  }
  if (rows.length > MAX_ROWS) {
    return { status: "error", message: "Too many rows in this import batch." };
  }

  const duplicateAction = formData.get("duplicateAction") === "skip" ? "skip" : "update";
  const importableRows = rows.filter((row) => row.importable);
  const skippedInvalid = rows.length - importableRows.length;

  const companyNames = [
    ...new Set(
      importableRows
        .map((row) => row.companyName?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ];

  // First non-null value found for each company name across the file's
  // rows — same fill-only-what's-missing philosophy as the contact fields
  // below, applied to the company: never overwrites one that's already set.
  const industryByCompanyName = new Map<string, Industry>();
  const notesByCompanyName = new Map<string, string>();
  const addressByCompanyName = new Map<string, string>();
  const phoneByCompanyName = new Map<string, string>();
  const websiteByCompanyName = new Map<string, string>();
  for (const row of importableRows) {
    const name = row.companyName?.trim();
    if (!name) continue;
    if (row.industry && !industryByCompanyName.has(name)) industryByCompanyName.set(name, row.industry);
    if (row.companyDescription && !notesByCompanyName.has(name)) {
      notesByCompanyName.set(name, row.companyDescription);
    }
    if (row.companyAddress && !addressByCompanyName.has(name)) {
      addressByCompanyName.set(name, row.companyAddress);
    }
    if (row.companyPhone && !phoneByCompanyName.has(name)) phoneByCompanyName.set(name, row.companyPhone);
    if (row.companyDomain && !websiteByCompanyName.has(name)) websiteByCompanyName.set(name, row.companyDomain);
  }

  const companyIdByName = new Map<string, string>();
  let companiesCreated = 0;
  for (const name of companyNames) {
    const existing = await db.partnerCompany.findFirst({
      where: { partnerId: partner.id, name },
      select: { id: true, industry: true, notes: true, address: true, phone: true, website: true },
    });
    const industry = industryByCompanyName.get(name);
    const notes = notesByCompanyName.get(name);
    const address = addressByCompanyName.get(name);
    const phone = phoneByCompanyName.get(name);
    const website = websiteByCompanyName.get(name);
    if (existing) {
      companyIdByName.set(name, existing.id);
      const fill: { industry?: Industry; notes?: string; address?: string; phone?: string; website?: string } = {};
      if (!existing.industry && industry) fill.industry = industry;
      if (!existing.notes && notes) fill.notes = notes;
      if (!existing.address && address) fill.address = address;
      if (!existing.phone && phone) fill.phone = phone;
      if (!existing.website && website) fill.website = website;
      if (Object.keys(fill).length > 0) {
        await db.partnerCompany.update({ where: { id: existing.id }, data: fill });
      }
    } else {
      const company = await db.partnerCompany.create({
        data: {
          name,
          partnerId: partner.id,
          industry: industry ?? null,
          notes: notes ?? null,
          address: address ?? null,
          phone: phone ?? null,
          website: website ?? null,
        },
        select: { id: true },
      });
      companyIdByName.set(name, company.id);
      companiesCreated += 1;
    }
  }

  // Pre-fetched once rather than looked up per row — phoneMatchKey isn't a
  // column Prisma can filter on, so matching by phone has to happen in JS
  // against the full set of this partner's phone-bearing contacts either way.
  type ExistingContact = {
    id: string;
    email: string | null;
    phone: string | null;
    title: string | null;
    companyId: string | null;
    notes: string | null;
  };
  const contactSelect = { id: true, email: true, phone: true, title: true, companyId: true, notes: true } as const;
  const emailsInFile = importableRows
    .map((row) => row.email?.trim())
    .filter((email): email is string => Boolean(email));
  const phoneKeysInFile = importableRows
    .map((row) => (row.phone ? phoneMatchKey(row.phone) : null))
    .filter((key): key is string => Boolean(key));
  const [existingByEmailRows, existingByPhoneRows] = await Promise.all([
    emailsInFile.length
      ? db.partnerContact.findMany({ where: { partnerId: partner.id, email: { in: emailsInFile } }, select: contactSelect })
      : Promise.resolve([] as ExistingContact[]),
    phoneKeysInFile.length
      ? db.partnerContact.findMany({ where: { partnerId: partner.id, phone: { not: null } }, select: contactSelect })
      : Promise.resolve([] as ExistingContact[]),
  ]);
  const existingByEmail = new Map<string, ExistingContact>(
    existingByEmailRows.map((c) => [c.email!.toLowerCase(), c]),
  );
  const existingByPhoneKey = new Map<string, ExistingContact>(
    existingByPhoneRows.map((c) => [phoneMatchKey(c.phone!), c]),
  );

  let created = 0;
  let updated = 0;
  let skippedDuplicates = 0;
  const seenEmails = new Set<string>();
  const seenPhoneKeys = new Set<string>();

  for (const row of importableRows) {
    const email = row.email?.trim() || null;
    const phone = row.phone?.trim() || null;
    const phoneKey = phone ? phoneMatchKey(phone) : null;
    const companyName = row.companyName?.trim();
    const companyId = companyName ? (companyIdByName.get(companyName) ?? null) : null;

    const emailKey = email?.toLowerCase();
    if ((emailKey && seenEmails.has(emailKey)) || (phoneKey && seenPhoneKeys.has(phoneKey))) {
      skippedDuplicates += 1;
      continue;
    }
    if (emailKey) seenEmails.add(emailKey);
    if (phoneKey) seenPhoneKeys.add(phoneKey);

    const existingContact =
      (emailKey && existingByEmail.get(emailKey)) || (phoneKey && existingByPhoneKey.get(phoneKey)) || null;

    if (existingContact) {
      if (duplicateAction === "skip") {
        skippedDuplicates += 1;
        continue;
      }

      // Only fills gaps — never overwrites a value the contact already has.
      const fill: { phone?: string; title?: string; companyId?: string; notes?: string } = {};
      if (!existingContact.phone && phone) fill.phone = phone;
      if (!existingContact.title && row.title?.trim()) fill.title = row.title.trim();
      if (!existingContact.companyId && companyId) fill.companyId = companyId;
      if (!existingContact.notes && row.notes?.trim()) fill.notes = row.notes.trim();

      if (Object.keys(fill).length > 0) {
        await db.partnerContact.update({ where: { id: existingContact.id }, data: fill });
        updated += 1;
      } else {
        skippedDuplicates += 1;
      }
      continue;
    }

    await db.partnerContact.create({
      data: {
        partnerId: partner.id,
        firstName: row.firstName ? toTitleCase(row.firstName) : "",
        lastName: row.lastName ? toTitleCase(row.lastName) : null,
        email,
        phone,
        title: row.title?.trim() || null,
        companyId,
        notes: row.notes?.trim() || null,
      },
    });
    created += 1;
  }

  revalidatePath("/business-portal/contacts");
  revalidatePath("/business-portal/companies");
  revalidatePath("/business-portal");

  return {
    status: "done",
    created,
    updated,
    skippedDuplicates,
    skippedInvalid,
    companiesCreated,
  };
}
