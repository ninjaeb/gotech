"use server";

import { deriveCompanyDomain, findOrCreateCompanyByName } from "@/lib/companies";
import type { ContactDraft } from "@/lib/contact-draft";
import { parseVCards } from "@/lib/vcard";
import { requireAdminAction } from "@/lib/auth/dal";

// vCards are plain text — even one with an inline photo rarely exceeds a
// couple hundred KB, so this is a generous ceiling, not a realistic ceiling.
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export type ImportVCardResult = { status: "ok"; data: ContactDraft } | { status: "error"; message: string };

export async function importVCard(formData: FormData): Promise<ImportVCardResult> {
  await requireAdminAction();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a .vcf file." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { status: "error", message: "That file is too large to be a vCard (max 2MB)." };
  }

  const text = await file.text();
  const cards = parseVCards(text);
  if (cards.length === 0) {
    return { status: "error", message: "Couldn't find a contact in that file — make sure it's a .vcf (vCard) export." };
  }

  const card = cards[0];
  if (!card.firstName && !card.lastName) {
    return { status: "error", message: "That vCard has no name on it — enter the details manually below." };
  }

  const company = await findOrCreateCompanyByName(card.companyName, {
    domain: card.email ? deriveCompanyDomain(card.email) : null,
    phone: card.companyPhone,
    address: card.companyAddress,
  });

  return {
    status: "ok",
    data: {
      firstName: card.firstName,
      lastName: card.lastName,
      title: card.title,
      email: card.email,
      phone: card.phone,
      company,
    },
  };
}
