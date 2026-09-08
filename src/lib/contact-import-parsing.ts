import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { splitFullName } from "@/lib/format";
import { isValidPhoneFormat, normalizePhone } from "@/lib/phone";
import { isValidEmailFormat } from "@/lib/email-format";
import { matchIndustry } from "@/lib/labels";
import { normalizeDomain } from "@/lib/companies";
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
  // These describe the *company*, not this row's contact — folded onto the
  // Company record (notes/address/phone/domain) in confirmContactImport,
  // same fill-only-what's-missing rule as industry below.
  companyDescription: string | null;
  companyAddress: string | null;
  companyPhone: string | null;
  companyDomain: string | null;
  issues: string[];
  /** False for rows with no derivable person name — can't become a Contact. */
  importable: boolean;
};

export type ParsedImport = {
  rows: ParsedContactRow[];
  headers: string[];
};

// Contact/company list exports name their columns differently depending on
// where they came from — Google Contacts, HubSpot, Salesforce, Outlook, or
// just a spreadsheet someone typed by hand. Match by intent (a handful of
// synonyms per field) rather than one fixed header set, so "just upload
// whatever you've got" actually works.
const FIRST_NAME_HEADERS = [/^first(\s*name)?$/i, /^given name$/i];
const LAST_NAME_HEADERS = [/^last(\s*name)?$/i, /^family name$/i, /^surname$/i];
const FULL_NAME_HEADERS = [/^name$/i, /^full name$/i, /^contact name$/i];
const ORG_NAME_HEADERS = [
  /^organization(\s*name)?$/i,
  /^organization 1 - name$/i,
  /^company(\s*name)?$/i,
  /^account(\s*name)?$/i,
  /^employer$/i,
  /^business(\s*name)?$/i,
];
const ORG_TITLE_HEADERS = [
  /^organization title$/i,
  /^organization 1 - title$/i,
  /^job(\s*title)?$/i,
  /^position$/i,
  /^role$/i,
  /^title$/i,
];
const NOTES_HEADERS = [/^notes?$/i];
const EMAIL_FALLBACK_HEADERS = [
  /^email(\s*address)?$/i,
  /^e-?mail$/i,
  /^email\s*1$/i,
  /^(work|primary|business)\s*email$/i,
];
const PHONE_FALLBACK_HEADERS = [
  /^phone(\s*number)?$/i,
  /^(mobile|cell|work|home|direct)(\s*phone)?$/i,
  /^telephone$/i,
  /^contact\s*number$/i,
];
// No Contact field of their own — folded into notes instead of dropped, so
// context from event/attendee-list style exports (as opposed to Google's
// own format) survives the import rather than silently disappearing.
const CATEGORY_HEADERS = [/^category$/i];
const INDUSTRY_HEADERS = [/^industry$/i];
const PROFILE_URL_HEADERS = [/^profile\s*url$/i, /^profile\s*link$/i, /^linked\s*in$/i];
// Free text about the company, not this row's contact — used to fill the
// Company's notes and, when there's no (or no matching) Industry column, as
// a fallback signal for matchIndustry() below (e.g. "software development
// agency" still maps to Technology even with no "Industry" column at all).
const DESCRIPTION_HEADERS = [
  /^(business|company)\s*description$/i,
  /^description$/i,
  /^about(\s*(the\s*)?(business|company))?$/i,
  /^summary$/i,
  /^bio$/i,
];
// "Address 1 - Formatted" is Google's own combined-address export column;
// everything else here covers non-Google sources. Always read onto
// companyAddress below — Contact itself has no address field of its own,
// so a bare "Address" column can only mean the company's.
const ADDRESS_HEADERS = [
  /^address\s*1\s*-\s*formatted$/i,
  /^(business|company)\s*address$/i,
  /^address$/i,
  /^location$/i,
];
// Distinct from PHONE_FALLBACK_HEADERS above (that's the person's own
// number) — only matches when the header is explicitly qualified as the
// company/business's phone, so a plain "Phone" column is never double
// counted as both.
const COMPANY_PHONE_HEADERS = [/^(company|business|organization|office)\s*phone(\s*number)?$/i];
const COMPANY_DOMAIN_HEADERS = [
  /^(company\s*)?website$/i,
  /^web\s*site$/i,
  /^(company\s*)?domain(\s*name)?$/i,
  /^url$/i,
];

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

type RawRecords = { headers: string[]; records: Record<string, string | undefined>[] };

function recordsFromCsv(csvText: string): RawRecords {
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
    throw new Error("Couldn't read that file as CSV — check it's a plain comma-separated export.");
  }
  if (records.length === 0) return { headers: [], records: [] };
  return { headers: Object.keys(records[0]), records };
}

// A cell's .value is a plain scalar for ordinary cells, but ExcelJS returns
// a structured object for rich text, hyperlinks, and formulas — this reads
// through all of those to the display text a person would actually see.
function cellToText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("text" in value) return value.text; // hyperlink cell — its display text
    if ("error" in value) return "";
    if ("result" in value) return cellToText(value.result ?? null); // formula — its cached result
  }
  return String(value);
}

async function recordsFromExcel(buffer: Buffer): Promise<RawRecords> {
  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs's bundled index.d.ts declares its own file-local `interface
    // Buffer extends ArrayBuffer` (never inside `declare global`), so
    // `load()`'s parameter type resolves to that broken stub — not our
    // real (generic, @types/node) Buffer, and not satisfiable from outside
    // that file. The value itself is a perfectly ordinary Node Buffer;
    // this is purely exceljs's stale type declaration, not a real mismatch.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
  } catch {
    throw new Error("Couldn't read that file as Excel — make sure it's a .xlsx file, not .xls or a different format.");
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) return { headers: [], records: [] };

  // Keyed by column number (not built as a plain array) so a blank header
  // cell in the middle of the sheet doesn't shift every column after it out
  // of alignment with its data rows.
  const headerByColumn = new Map<number, string>();
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const text = cellToText(cell.value).trim();
    if (text) headerByColumn.set(colNumber, text);
  });

  const records: Record<string, string | undefined>[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (row.cellCount === 0) continue;

    const record: Record<string, string | undefined> = {};
    let hasValue = false;
    for (const [colNumber, header] of headerByColumn) {
      const text = cellToText(row.getCell(colNumber).value).trim();
      if (text) hasValue = true;
      record[header] = text || undefined;
    }
    if (hasValue) records.push(record);
  }

  return { headers: [...headerByColumn.values()], records };
}

function mapRecordsToContactRows(headers: string[], records: Record<string, string | undefined>[]): ParsedImport {
  if (records.length === 0) return { rows: [], headers: [] };

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
  const descriptionHeader = findHeader(headers, DESCRIPTION_HEADERS);
  const addressHeader = findHeader(headers, ADDRESS_HEADERS);
  const companyPhoneHeader = findHeader(headers, COMPANY_PHONE_HEADERS);
  const companyDomainHeader = findHeader(headers, COMPANY_DOMAIN_HEADERS);

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
    const companyDescription = readHeader(record, descriptionHeader) || null;
    const companyAddress = readHeader(record, addressHeader) || null;
    // Same normalize-then-validate treatment as the contact's own phone
    // above, and the same bare-domain shape the manual company form and
    // deriveCompanyDomain() already store (see src/lib/companies.ts) — a
    // badly-formed value is dropped rather than stored raw, silently
    // (unlike the contact's own email/phone, an issue this is not
    // something worth flagging the whole row over).
    const rawCompanyPhone = readHeader(record, companyPhoneHeader) || null;
    const normalizedCompanyPhone = rawCompanyPhone ? normalizePhone(rawCompanyPhone) : null;
    const companyPhone = normalizedCompanyPhone && isValidPhoneFormat(normalizedCompanyPhone) ? normalizedCompanyPhone : null;
    const rawCompanyDomain = readHeader(record, companyDomainHeader) || null;
    const companyDomain = rawCompanyDomain ? normalizeDomain(rawCompanyDomain) : null;
    // Explicit Industry column wins when it maps to something; a business
    // description is only consulted as a fallback signal (e.g. "software
    // development agency" still infers Technology with no Industry column
    // at all, or when that column's value didn't match anything curated).
    const industry =
      (industryRaw && matchIndustry(industryRaw)) || (companyDescription && matchIndustry(companyDescription)) || null;
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
      companyDescription,
      companyAddress,
      companyPhone,
      companyDomain,
      issues,
      // Needs a name to become a Contact, and at least one way to reach
      // them — a name-only row with no email or phone isn't a usable CRM
      // contact, just noise (see the "No email or phone" issue above).
      importable: Boolean((firstName || lastName) && (email || phone)),
    };
  });

  return { rows, headers };
}

// Single entry point for the import UI — reads the upload, figures out CSV
// vs. Excel from its name/type, and maps its columns onto Contact/Company
// fields by header intent rather than requiring an exact template. Adding a
// third source format later only means adding a records-from-X reader that
// feeds the same mapRecordsToContactRows.
export async function parseContactImportFile(file: File): Promise<ParsedImport> {
  const name = file.name.toLowerCase();
  const isExcel =
    name.endsWith(".xlsx") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const { headers, records } = isExcel
    ? await recordsFromExcel(Buffer.from(await file.arrayBuffer()))
    : recordsFromCsv(await file.text());

  return mapRecordsToContactRows(headers, records);
}
