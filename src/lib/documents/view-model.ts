import type { Prisma } from "@/generated/prisma/client";
import type { BillingSettings } from "@/lib/settings";
import { quoteDerivedState, type QuoteDerivedState } from "@/lib/documents/dates";
import { formatDocumentNumber } from "@/lib/documents/numbering-format";

// Plain, serialisable shapes for everything that renders or edits a quote.
// Prisma rows carry Decimal fields that can't cross the Server → Client
// boundary, so pages convert once here and every component (DocumentSheet,
// LineItemsForm, the portal list) takes these instead of Prisma types.

export type LineItemDraft = {
  description: string;
  quantity: string;
  unitPrice: string;
  unit: string | null;
  taxable: boolean;
  servicePackageId: string | null;
};

export type CatalogComponentOption = {
  servicePackageId: string;
  description: string;
  unitPrice: string;
  quantity: string;
  unit: string | null;
  taxable: boolean;
};

export type CatalogOption = {
  id: string;
  name: string;
  description: string | null;
  unitPrice: string;
  unit: string | null;
  taxable: boolean;
  components: CatalogComponentOption[];
};

export type TemplateOption = { id: string; name: string; notes: string | null; items: LineItemDraft[] };

type ItemRow = {
  description: string;
  quantity: Prisma.Decimal | number | string;
  unitPrice: Prisma.Decimal | number | string;
  unit: string | null;
  taxable: boolean;
  servicePackageId: string | null;
};

export function toLineItemsDraft(items: ItemRow[]): LineItemDraft[] {
  return items.map((item) => ({
    description: item.description,
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toString(),
    unit: item.unit,
    taxable: item.taxable,
    servicePackageId: item.servicePackageId,
  }));
}

type CatalogRow = {
  id: string;
  name: string;
  description: string | null;
  unitPrice: Prisma.Decimal | number | string;
  unit: string | null;
  taxable: boolean;
  components: {
    quantity: Prisma.Decimal | number | string;
    product: {
      id: string;
      name: string;
      description: string | null;
      unitPrice: Prisma.Decimal | number | string;
      unit: string | null;
      taxable: boolean;
    };
  }[];
};

export function catalogDescription(item: { name: string; description: string | null }) {
  return item.description ? `${item.name} — ${item.description}` : item.name;
}

export function toCatalogOptions(packages: CatalogRow[]): CatalogOption[] {
  return packages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    unitPrice: pkg.unitPrice.toString(),
    unit: pkg.unit,
    taxable: pkg.taxable,
    components: pkg.components.map((c) => ({
      servicePackageId: c.product.id,
      description: catalogDescription(c.product),
      unitPrice: c.product.unitPrice.toString(),
      quantity: c.quantity.toString(),
      unit: c.product.unit,
      taxable: c.product.taxable,
    })),
  }));
}

// The Prisma include every quote renderer needs.
export const QUOTE_SHEET_INCLUDE = {
  items: { orderBy: { sortOrder: "asc" } },
  deal: { select: { id: true, title: true, companyId: true, contactId: true } },
  contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
  supersededBy: { select: { id: true, revision: true, shareToken: true } },
  revisionOf: { select: { id: true, revision: true } },
} satisfies Prisma.QuoteInclude;

export type QuoteSheetRow = Prisma.QuoteGetPayload<{ include: typeof QUOTE_SHEET_INCLUDE }>;

export type QuoteViewModel = {
  id: string;
  title: string;
  status: QuoteSheetRow["status"];
  derived: QuoteDerivedState;
  isDraft: boolean;
  isOpen: boolean;
  number: string | null; // "Q-0012" once issued
  numberLabel: string; // "Q-0012 · Rev 2", "Draft", "Draft (Rev 2 of Q-0012)"
  revision: number;
  shareKey: string; // what /q/[key] takes: the token, or the id for legacy rows
  currency: string;
  issuedAt: Date | null;
  validUntil: Date | null;
  respondedAt: Date | null;
  withdrawnAt: Date | null;
  issuer: { name: string; registrationNo: string | null; taxNo: string | null; address: string | null; phone: string | null; email: string | null; website: string | null };
  billTo: { name: string; company: string; registrationNo: string; address: string; email: string };
  items: { id: string; description: string; quantity: string; unitPrice: string; unit: string | null; taxable: boolean; lineTotal: string }[];
  discountType: QuoteSheetRow["discountType"];
  discountValue: string;
  subtotal: string;
  discountAmount: string;
  taxLabel: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  notes: string | null;
  acceptedByName: string | null;
  acceptedVia: QuoteSheetRow["acceptedVia"];
  acceptedReference: string | null;
  supersededBy: { id: string; revision: number; shareKey: string } | null;
  revisionOf: { id: string; revision: number } | null;
  dealId: string;
  dealTitle: string;
  contact: { id: string; name: string; email: string | null; phone: string | null } | null;
};

export function quoteNumberLabel(quote: { number: string | null; revision: number; revisionOf?: { revision: number } | null }, pendingRoot?: string | null) {
  if (quote.number) return quote.revision > 1 ? `${quote.number} · Rev ${quote.revision}` : quote.number;
  if (pendingRoot) return `Draft · Rev ${quote.revision} of ${pendingRoot}`;
  return "Draft";
}

export function buildQuoteViewModel(quote: QuoteSheetRow, settings: BillingSettings, now: Date = new Date()): QuoteViewModel {
  const derived = quoteDerivedState(quote, settings.utcOffsetMinutes, now);
  const isDraft = quote.status === "DRAFT";
  const isOpen = (quote.status === "SENT" || quote.status === "VIEWED") && derived === null;
  // Rows issued before snapshots existed fall back to live Settings.
  const snapshotted = quote.issuerName !== null;
  const contactName = quote.contact ? [quote.contact.firstName, quote.contact.lastName].filter(Boolean).join(" ") : null;
  return {
    id: quote.id,
    title: quote.title,
    status: quote.status,
    derived,
    isDraft,
    isOpen,
    number: quote.number,
    numberLabel: quoteNumberLabel(quote),
    revision: quote.revision,
    shareKey: quote.shareToken ?? quote.id,
    currency: quote.currency,
    issuedAt: quote.issuedAt,
    validUntil: quote.validUntil,
    respondedAt: quote.respondedAt,
    withdrawnAt: quote.withdrawnAt,
    issuer: snapshotted
      ? {
          name: quote.issuerName ?? "",
          registrationNo: quote.issuerRegistrationNo,
          taxNo: quote.issuerTaxNo,
          address: quote.issuerAddress,
          phone: quote.issuerPhone,
          email: quote.issuerEmail,
          website: settings.businessWebsite,
        }
      : {
          name: settings.businessName,
          registrationNo: settings.businessRegistrationNo,
          taxNo: settings.taxRate > 0 ? settings.taxRegistrationNo : null,
          address: settings.businessAddress,
          phone: settings.businessPhone,
          email: settings.businessEmail,
          website: settings.businessWebsite,
        },
    billTo: {
      name: quote.billToName ?? contactName ?? "",
      company: quote.billToCompany ?? "",
      registrationNo: quote.billToRegistrationNo ?? "",
      address: quote.billToAddress ?? "",
      email: quote.billToEmail ?? quote.contact?.email ?? "",
    },
    items: quote.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      unit: item.unit,
      taxable: item.taxable,
      lineTotal: item.lineTotal.toString(),
    })),
    discountType: quote.discountType,
    discountValue: quote.discountValue.toString(),
    subtotal: quote.subtotal.toString(),
    discountAmount: quote.discountAmount.toString(),
    taxLabel: quote.taxLabel,
    taxRate: quote.taxRate.toString(),
    taxAmount: quote.taxAmount.toString(),
    total: quote.total.toString(),
    notes: quote.notes,
    acceptedByName: quote.acceptedByName,
    acceptedVia: quote.acceptedVia,
    acceptedReference: quote.acceptedReference,
    supersededBy: quote.supersededBy
      ? { id: quote.supersededBy.id, revision: quote.supersededBy.revision, shareKey: quote.supersededBy.shareToken ?? quote.supersededBy.id }
      : null,
    revisionOf: quote.revisionOf,
    dealId: quote.deal.id,
    dealTitle: quote.deal.title,
    contact: quote.contact
      ? { id: quote.contact.id, name: contactName ?? "", email: quote.contact.email, phone: quote.contact.phone }
      : null,
  };
}

// Preview of what the next issued number will look like, for Settings → Billing.
export function nextNumberPreview(prefix: string, nextNumber: number, padding: number) {
  return formatDocumentNumber(prefix, nextNumber, padding);
}
