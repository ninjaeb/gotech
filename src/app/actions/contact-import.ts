"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  parseGoogleContactsCsv,
  type ParsedContactRow,
} from "@/lib/google-contacts-import";

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
  totalRows: number;
  importableRows: number;
  skippedRows: number;
};

export type ImportResult = {
  status: "done";
  created: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  companiesCreated: number;
};

export async function previewContactImport(
  formData: FormData,
): Promise<ImportPreview | ImportError> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a CSV file to import." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { status: "error", message: "That file is too large (max 5MB)." };
  }

  const text = await file.text();
  let parsed: ReturnType<typeof parseGoogleContactsCsv>;
  try {
    parsed = parseGoogleContactsCsv(text);
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
    ? await db.contact.findMany({
        where: { email: { in: emails } },
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

  return {
    status: "preview",
    fileName: file.name,
    rows: parsed.rows,
    duplicateEmails,
    totalRows: parsed.rows.length,
    importableRows: parsed.rows.filter((row) => row.importable).length,
    skippedRows: parsed.rows.filter((row) => !row.importable).length,
  };
}

export async function confirmContactImport(
  formData: FormData,
): Promise<ImportResult | ImportError> {
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

  const skipDuplicates = formData.get("skipDuplicates") === "on";
  const importableRows = rows.filter((row) => row.importable);
  const skippedInvalid = rows.length - importableRows.length;

  const companyNames = [
    ...new Set(
      importableRows
        .map((row) => row.companyName?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ];

  const companyIdByName = new Map<string, string>();
  let companiesCreated = 0;
  for (const name of companyNames) {
    const existing = await db.company.findFirst({
      where: { name },
      select: { id: true },
    });
    if (existing) {
      companyIdByName.set(name, existing.id);
    } else {
      const company = await db.company.create({
        data: { name },
        select: { id: true },
      });
      companyIdByName.set(name, company.id);
      companiesCreated += 1;
    }
  }

  let created = 0;
  let skippedDuplicates = 0;
  const seenEmails = new Set<string>();

  for (const row of importableRows) {
    const email = row.email?.trim() || null;

    if (email) {
      const key = email.toLowerCase();
      if (seenEmails.has(key)) {
        skippedDuplicates += 1;
        continue;
      }
      seenEmails.add(key);

      if (skipDuplicates) {
        const existingContact = await db.contact.findFirst({
          where: { email },
          select: { id: true },
        });
        if (existingContact) {
          skippedDuplicates += 1;
          continue;
        }
      }
    }

    const companyName = row.companyName?.trim();
    const companyId = companyName ? (companyIdByName.get(companyName) ?? null) : null;

    await db.contact.create({
      data: {
        firstName: row.firstName || "",
        lastName: row.lastName || "",
        email,
        phone: row.phone?.trim() || null,
        title: row.title?.trim() || null,
        companyId,
        notes: row.notes?.trim() || null,
      },
    });
    created += 1;
  }

  revalidatePath("/contacts");
  revalidatePath("/companies");
  revalidatePath("/");

  return {
    status: "done",
    created,
    skippedDuplicates,
    skippedInvalid,
    companiesCreated,
  };
}
