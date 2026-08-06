import { parse } from "csv-parse/sync";

export type ParsedContactRow = {
  row: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  companyName: string | null;
  notes: string | null;
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
  /^title$/i,
];
const NOTES_HEADERS = [/^notes$/i, /^note$/i];
const EMAIL_FALLBACK_HEADERS = [/^email$/i, /^e-?mail$/i, /^email address$/i];
const PHONE_FALLBACK_HEADERS = [/^phone$/i, /^phone number$/i];

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

  const rows: ParsedContactRow[] = records.map((record, index) => {
    const issues: string[] = [];

    let firstName = readHeader(record, firstNameHeader);
    let lastName = readHeader(record, lastNameHeader);

    if (!firstName && !lastName && fullNameHeader) {
      const full = readHeader(record, fullNameHeader);
      if (full) {
        const parts = full.split(/\s+/);
        firstName = parts[0] ?? "";
        lastName = parts.slice(1).join(" ");
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

    const email =
      firstMatchingValue(record, headers, EMAIL_VALUE_PATTERN) ||
      readHeader(record, emailFallbackHeader) ||
      null;
    const phone =
      firstMatchingValue(record, headers, PHONE_VALUE_PATTERN) ||
      readHeader(record, phoneFallbackHeader) ||
      null;

    if (!email && !phone) {
      issues.push("No email or phone");
    }

    return {
      row: index + 1,
      firstName,
      lastName,
      email,
      phone,
      title: readHeader(record, orgTitleHeader) || null,
      companyName,
      notes: readHeader(record, notesHeader) || null,
      issues,
      importable: Boolean(firstName || lastName),
    };
  });

  return { rows, headers };
}
