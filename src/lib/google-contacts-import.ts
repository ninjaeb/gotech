import { parse } from "csv-parse/sync";
import { splitFullName } from "@/lib/format";
import { isValidPhoneFormat, normalizePhone } from "@/lib/phone";
import { isValidEmailFormat } from "@/lib/email-format";
import { matchIndustry } from "@/lib/labels";
import type { Industry } from "@/generated/prisma/client";

export type ParsedContactRow = {
  row: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  companyName: string | null;
  industry: Industry | null;
  notes: string | null;
  imageUrl: string | null;
  issues: string[];
  /** False for rows with no derivable person name — can't become a Contact. */
  importable: boolean;
};

export type ParsedImport = {
  rows: ParsedContactRow[];
  headers: string[];
};

// Google's contacts CSV export has changed shape over the years, and other
// tools (Outlook, plain spreadsheets) use their own header names for the
// same data. Match by intent rather than one fixed header set.
const FIRST_NAME_HEADERS = [/^first name$/i, /^given name$/i];
const LAST_NAME_HEADERS = [/^last name$/i, /^family name$/i, /^surname$/i];
const FULL_NAME_HEADERS = [/^name$/i, /^full name$/i];
const ORG_NAME_HEADERS = [
  /^organization name$/i,
  /^organization 1 - name$/i,
  /^company$/i,
  /^company name$/i,
];
const ORG_TITLE_HEADERS = [
  /^organization title$/i,
  /^organization 1 - title$/i,
  /^job title$/i,
  /^position$/i,
  /^role$/i,
  /^title$/i,
];
const NOTES_HEADERS = [/^notes$/i, /^note$/i];
const EMAIL_FALLBACK_HEADERS = [/^email$/i, /^e-?mail$/i, /^email address$/i];
const PHONE_FALLBACK_HEADERS = [/^phone$/i, /^phone number$/i];
// No Contact field of their own — folded into notes instead of dropped, so
// context from event/attendee-list style exports (as opposed to Google's
// own format) survives the import rather than silently disappearing.
const CATEGORY_HEADERS = [/^category$/i];
const INDUSTRY_HEADERS = [/^industry$/i];
const PROFILE_URL_HEADERS = [/^profile\s*url$/i, /^profile\s*link$/i];

// Fetched and stored as the Contact's photo (see fetchPhotoAsDataUrl in
// src/app/actions/contact-import.ts) — this is the one exception to
// "no Contact field of their own", since photoUrl already exists on Contact.
const IMAGE_URL_HEADERS = [/^image\s*url$/i, /^photo\s*url$/i, /^avatar(\s*url)?$/i, /^picture(\s*url)?$/i];

// Google's numbered multi-value columns, e.g. "E-mail 1 - Value",
// "E-mail 2 - Value", "Phone 1 - Value" (works for both the pre- and
// post-2023 export formats, which share this "N - Value" suffix).
const EMAIL_VALUE_PATTERN = /^e-?mail\s*\d*\s*-\s*value$/i;
const PHONE_VALUE_PATTERN = /^phone\s*\d*\s*-\s*value$/i;

function findHeader(headers: string[], candidates: RegExp[]): string | null {
  for (const pattern of candidates) {
    const match = headers.find((header) => pattern.test(header.trim()));
    if (match) return match;
  }
  return null;
}

function firstMatchingValue(
  record: Record<string, string | undefined>,
  headers: string[],
  pattern: RegExp,
): string | null {
  for (const header of headers) {
    if (!pattern.test(header)) continue;
    const value = record[header]?.trim();
    if (value) return value;
  }
  return null;
}

function readHeader(
  record: Record<string, string | undefined>,
  header: string | null,
): string {
  if (!header) return "";
  return record[header]?.trim() ?? "";
}

export function parseGoogleContactsCsv(csvText: string): ParsedImport {
  let records: Record<string, string | undefined>[];
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    });
  } catch {
    throw new Error(
      "Couldn't read that file as CSV. Export your contacts from Google Contacts as Google CSV and upload the .csv file.",
    );
  }

  if (records.length === 0) {
    return { rows: [], headers: [] };
  }

  const headers = Object.keys(records[0]);
  const firstNameHeader = findHeader(headers, FIRST_NAME_HEADERS);
  const lastNameHeader = findHeader(headers, LAST_NAME_HEADERS);
  const fullNameHeader = findHeader(headers, FULL_NAME_HEADERS);
  const orgNameHeader = findHeader(headers, ORG_NAME_HEADERS);
  const orgTitleHeader = findHeader(headers, ORG_TITLE_HEADERS);
  const notesHeader = findHeader(headers, NOTES_HEADERS);
  const emailFallbackHeader = findHeader(headers, EMAIL_FALLBACK_HEADERS);
  const phoneFallbackHeader = findHeader(headers, PHONE_FALLBACK_HEADERS);
  const categoryHeader = findHeader(headers, CATEGORY_HEADERS);
  const industryHeader = findHeader(headers, INDUSTRY_HEADERS);
  const profileUrlHeader = findHeader(headers, PROFILE_URL_HEADERS);
  const imageUrlHeader = findHeader(headers, IMAGE_URL_HEADERS);

  const rows: ParsedContactRow[] = records.map((record, index) => {
    const issues: string[] = [];

    let firstName = readHeader(record, firstNameHeader);
    let lastName = readHeader(record, lastNameHeader);

    if (!firstName && !lastName && fullNameHeader) {
      const full = readHeader(record, fullNameHeader);
      if (full) {
        ({ firstName, lastName } = splitFullName(full));
      }
    }

    const companyName = readHeader(record, orgNameHeader) || null;

    if (!firstName && !lastName) {
      issues.push(
        companyName
          ? "No person name (company-only entry) — skipped"
          : "Missing name — skipped",
      );
    }

    const rawEmail =
      firstMatchingValue(record, headers, EMAIL_VALUE_PATTERN) ||
      readHeader(record, emailFallbackHeader) ||
      null;
    const rawPhone =
      firstMatchingValue(record, headers, PHONE_VALUE_PATTERN) ||
      readHeader(record, phoneFallbackHeader) ||
      null;

    // Drop the specific bad value rather than skipping the whole row — a
    // contact with a good email and a badly-formatted phone is still worth
    // importing. normalizePhone only tidies separators (spaces/dashes/
    // parens); it can't invent a missing country code, so a bare local
    // number still fails isValidPhoneFormat and gets dropped here too.
    const email = rawEmail && isValidEmailFormat(rawEmail) ? rawEmail : null;
    if (rawEmail && !email) issues.push(`Invalid email format ("${rawEmail}") — dropped`);
    const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : null;
    const phone = normalizedPhone && isValidPhoneFormat(normalizedPhone) ? normalizedPhone : null;
    if (rawPhone && !phone) issues.push(`Phone missing a country code ("${rawPhone}") — dropped`);

    if (!email && !phone) {
      issues.push("No email or phone");
    }

    const category = readHeader(record, categoryHeader);
    const industryRaw = readHeader(record, industryHeader);
    const industry = industryRaw ? matchIndustry(industryRaw) : null;
    const profileUrl = readHeader(record, profileUrlHeader);
    const extraContext = [
      category && `Category: ${category}`,
      // Only noted here when it *didn't* map to a curated Industry below —
      // once it's a structured field on the Company, repeating it as text
      // would just be clutter.
      industryRaw && !industry && `Industry: ${industryRaw}`,
      profileUrl && `Profile: ${profileUrl}`,
    ]
      .filter(Boolean)
      .join(" | ");
    const notes = [readHeader(record, notesHeader), extraContext].filter(Boolean).join("\n") || null;

    return {
      row: index + 1,
      firstName,
      lastName,
      email,
      phone,
      title: readHeader(record, orgTitleHeader) || null,
      companyName,
      industry,
      notes,
      imageUrl: readHeader(record, imageUrlHeader) || null,
      issues,
      // Needs a name to become a Contact, and at least one way to reach
      // them — a name-only row with no email or phone isn't a usable CRM
      // contact, just noise (see the "No email or phone" issue above).
      importable: Boolean((firstName || lastName) && (email || phone)),
    };
  });

  return { rows, headers };
}
