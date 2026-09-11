import "server-only";

import { db } from "@/lib/db";
import { toCatalogOptions, toLineItemsDraft, type CatalogOption, type TemplateOption } from "@/lib/documents/view-model";

// The pickers on the quote/template editors — active catalog items only
// (retired ones stay on historical documents but leave every picker).
export async function loadCatalogOptions(): Promise<CatalogOption[]> {
  const packages = await db.servicePackage.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { components: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
  });
  return toCatalogOptions(packages);
}

export async function loadTemplateOptions(): Promise<TemplateOption[]> {
  const templates = await db.quoteTemplate.findMany({
    orderBy: { name: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    notes: template.notes,
    items: toLineItemsDraft(template.items),
  }));
}

// Contacts a quote can be addressed to: the deal's own contact plus everyone
// at its company.
export async function loadQuoteContacts(deal: { contactId: string | null; companyId: string | null }) {
  const contacts = await db.contact.findMany({
    where: {
      OR: [
        ...(deal.companyId ? [{ companyId: deal.companyId }] : []),
        ...(deal.contactId ? [{ id: deal.contactId }] : []),
      ],
    },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  return contacts.map((contact) => ({ id: contact.id, name: [contact.firstName, contact.lastName].filter(Boolean).join(" ") }));
}

export async function loadBusinessLogoUrl(): Promise<string | null> {
  const logo = await db.businessLogo.findUnique({ where: { id: "singleton" }, select: { updatedAt: true } });
  return logo ? `/api/settings/logo?v=${logo.updatedAt.getTime()}` : null;
}
