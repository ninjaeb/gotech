"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { InvoiceStatus, Prisma } from "@/generated/prisma/client";
import { requireAdminAction, requireSalesAction } from "@/lib/auth/dal";
import { getBillingSettings, type BillingSettings } from "@/lib/settings";
import { computeTotals, normalizeMoney } from "@/lib/documents/money";
import { addDays, orgToday, toDateOnly } from "@/lib/documents/dates";
import { billToSchema, discountSchema, firstIssueMessage, lineItemSchema, parseItemsJson } from "@/lib/documents/schemas";
import {
  allocateDocumentNumber,
  ensureSequenceRow,
  ISSUE_TRANSACTION_OPTIONS,
  withIssueRetry,
} from "@/lib/documents/numbering";
import { logDocumentEvent } from "@/lib/documents/events";
import { revalidateInvoicePaths } from "@/lib/documents/revalidate";
import { billToDefaults, issuerSnapshot } from "@/lib/documents/snapshots";
import { withFlash } from "@/lib/utils";

const invoiceSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  amount: z.coerce.number().min(0, "Amount must be zero or more"),
  status: z.nativeEnum(InvoiceStatus).default(InvoiceStatus.DRAFT),
  dueDate: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type InvoiceFormState = { error: string } | undefined;

function parseInvoiceForm(formData: FormData) {
  const parsed = invoiceSchema.safeParse({
    title: formData.get("title"),
    amount: formData.get("amount"),
    status: formData.get("status") || InvoiceStatus.DRAFT,
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid invoice data");
  }
  return parsed.data;
}

// DRAFT clears sentAt; any other status sets it (once — see below). Only
// PAID_IN_FULL carries a paidAt; moving off it clears the timestamp rather
// than leaving a stale one behind if a status change is corrected.
function statusTimestamps(status: InvoiceStatus, previousSentAt: Date | null) {
  return {
    sentAt: status === "DRAFT" ? null : (previousSentAt ?? new Date()),
    paidAt: status === "PAID_IN_FULL" ? new Date() : null,
  };
}

export async function createInvoice(
  projectId: string,
  _prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  await requireAdminAction();
  let data;
  try {
    data = parseInvoiceForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid invoice data" };
  }

  await db.invoice.create({
    data: {
      projectId,
      title: data.title,
      amount: data.amount,
      status: data.status,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes || null,
      ...statusTimestamps(data.status, null),
    },
  });

  revalidatePath(`/system/projects/${projectId}`);
  redirect(`/system/projects/${projectId}`);
}

export async function updateInvoice(
  invoiceId: string,
  _prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  await requireAdminAction();
  let data;
  try {
    data = parseInvoiceForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid invoice data" };
  }

  const previous = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: { sentAt: true },
  });

  const invoice = await db.invoice.update({
    where: { id: invoiceId },
    data: {
      title: data.title,
      amount: data.amount,
      status: data.status,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes || null,
      ...statusTimestamps(data.status, previous.sentAt),
    },
  });

  revalidatePath(`/system/projects/${invoice.projectId}`);
  redirect(`/system/projects/${invoice.projectId}`);
}

export async function changeInvoiceStatus(id: string, status: InvoiceStatus) {
  await requireAdminAction();
  const previous = await db.invoice.findUniqueOrThrow({ where: { id }, select: { sentAt: true } });
  const invoice = await db.invoice.update({
    where: { id },
    data: { status, ...statusTimestamps(status, previous.sentAt) },
  });
  revalidatePath(`/system/projects/${invoice.projectId}`);
}

export async function deleteInvoice(id: string, formData: FormData) {
  void formData;
  await requireAdminAction();
  const invoice = await db.invoice.delete({ where: { id } });
  revalidatePath(`/system/projects/${invoice.projectId}`);
}

// ---------------------------------------------------------------------------
// Numbered, Deal-scoped invoices — a close mirror of src/app/actions/quotes.ts
// (see that file for the fuller commentary this one leans on). No revisions
// here: an issued invoice is corrected with a void + a fresh one, not a
// revision chain, since a client billing record shouldn't quietly change
// shape after the fact the way a still-negotiating quote can.

export type DealInvoiceFormState = { error: string } | undefined;
export type InvoiceActionState = { error: string } | { success: true } | undefined;

const invoiceFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(191),
  notes: z.string().trim().max(10000).optional(),
  contactId: z.string().trim().optional(),
  dueDate: z.string().trim().optional(),
  items: z.array(lineItemSchema).min(1, "Add at least one line item"),
});

type ParsedInvoiceForm = ReturnType<typeof buildInvoiceData>;

function buildInvoiceData(formData: FormData, settings: BillingSettings) {
  const base = invoiceFormSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes"),
    contactId: formData.get("contactId"),
    dueDate: formData.get("dueDate"),
    items: parseItemsJson(formData),
  });
  if (!base.success) throw new Error(firstIssueMessage(base.error, "Invalid invoice data"));

  const discount = discountSchema.safeParse({
    discountType: formData.get("discountType") || "NONE",
    discountValue: formData.get("discountValue") || "0",
  });
  if (!discount.success) throw new Error(firstIssueMessage(discount.error, "Invalid discount"));

  const billTo = billToSchema.safeParse({
    billToName: formData.get("billToName") ?? "",
    billToCompany: formData.get("billToCompany") ?? "",
    billToRegistrationNo: formData.get("billToRegistrationNo") ?? "",
    billToAddress: formData.get("billToAddress") ?? "",
    billToEmail: formData.get("billToEmail") ?? "",
  });
  if (!billTo.success) throw new Error(firstIssueMessage(billTo.error, "Invalid bill-to details"));

  let dueDate: Date | null = null;
  if (base.data.dueDate) {
    dueDate = toDateOnly(base.data.dueDate);
    if (!dueDate) throw new Error("Due date must be a date");
  }

  const discountValue = discount.data.discountType === "NONE" ? "0" : discount.data.discountValue;
  const totals = computeTotals(
    base.data.items.map((item) => ({ quantity: item.quantity, unitPrice: item.unitPrice, taxable: item.taxable })),
    { discountType: discount.data.discountType, discountValue, taxRate: settings.taxRate },
  );

  return {
    title: base.data.title,
    notes: base.data.notes || null,
    contactId: base.data.contactId || null,
    dueDate,
    discountType: discount.data.discountType,
    discountValue: normalizeMoney(discountValue),
    billToName: billTo.data.billToName || null,
    billToCompany: billTo.data.billToCompany || null,
    billToRegistrationNo: billTo.data.billToRegistrationNo || null,
    billToAddress: billTo.data.billToAddress || null,
    billToEmail: billTo.data.billToEmail || null,
    subtotal: normalizeMoney(totals.subtotal),
    discountAmount: normalizeMoney(totals.discountAmount),
    taxLabel: settings.taxLabel,
    taxRate: normalizeMoney(settings.taxRate),
    taxAmount: normalizeMoney(totals.taxAmount),
    total: normalizeMoney(totals.total),
    // Kept in sync with `total` — every existing amount-based read (the
    // dashboard stat, the client portal, the Project page) reads this
    // column, and a numbered invoice should show up there too.
    amount: normalizeMoney(totals.total),
    items: base.data.items.map((item, index) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: normalizeMoney(item.unitPrice),
      unit: item.unit || null,
      taxable: item.taxable,
      lineTotal: normalizeMoney(totals.lineTotals[index]),
      servicePackageId: item.servicePackageId || null,
      sortOrder: index,
    })),
  };
}

// Catalog cost at pick time, for the staff-only margin view — looked up
// once per save rather than trusted from the form. Same helper as quotes.ts's
// own withUnitCosts, kept as a separate copy rather than shared: small,
// stable, and not worth a cross-file dependency between the two document
// actions files.
async function withUnitCosts(items: ParsedInvoiceForm["items"]) {
  const ids = Array.from(new Set(items.map((item) => item.servicePackageId).filter((id): id is string => Boolean(id))));
  if (ids.length === 0) return items.map((item) => ({ ...item, unitCost: null as string | null }));
  const packages = await db.servicePackage.findMany({ where: { id: { in: ids } }, select: { id: true, unitCost: true } });
  const costs = new Map(packages.map((pkg) => [pkg.id, pkg.unitCost ? pkg.unitCost.toString() : null]));
  return items.map((item) => ({ ...item, unitCost: item.servicePackageId ? (costs.get(item.servicePackageId) ?? null) : null }));
}

function isIssueIntent(formData: FormData) {
  return formData.get("intent") === "issue";
}

// ---------------------------------------------------------------------------
// Drafts

export async function createDealInvoice(dealId: string, _prevState: DealInvoiceFormState, formData: FormData): Promise<DealInvoiceFormState> {
  const user = await requireSalesAction();
  const settings = await getBillingSettings();
  let data: ParsedInvoiceForm;
  try {
    data = buildInvoiceData(formData, settings);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid invoice data" };
  }

  const deal = await db.deal.findUnique({ where: { id: dealId }, select: { id: true, contactId: true, project: { select: { id: true } } } });
  if (!deal) return { error: "That deal no longer exists." };

  const { items, ...fields } = data;
  const itemsWithCost = await withUnitCosts(items);

  const invoice = await db.invoice.create({
    data: {
      ...fields,
      contactId: fields.contactId ?? deal.contactId,
      currency: settings.currency,
      dealId,
      projectId: deal.project?.id ?? null,
      items: { create: itemsWithCost },
    },
    select: { id: true },
  });
  await logDocumentEvent(db, { type: "CREATED", invoiceId: invoice.id, actorId: user.id, actorLabel: user.name });

  if (isIssueIntent(formData)) {
    const issued = await issueInvoice(invoice.id);
    if (issued && "error" in issued) {
      revalidateInvoicePaths(dealId, invoice.id, deal.project?.id);
      redirect(withFlash(`/system/deals/${dealId}/invoices/${invoice.id}`, `Saved as a draft — ${issued.error}`));
    }
    redirect(withFlash(`/system/deals/${dealId}/invoices/${invoice.id}`, "Invoice issued."));
  }

  revalidateInvoicePaths(dealId, invoice.id, deal.project?.id);
  redirect(withFlash(`/system/deals/${dealId}/invoices/${invoice.id}`, "Draft saved."));
}

export async function updateDealInvoice(invoiceId: string, _prevState: DealInvoiceFormState, formData: FormData): Promise<DealInvoiceFormState> {
  const user = await requireSalesAction();
  const settings = await getBillingSettings();
  let data: ParsedInvoiceForm;
  try {
    data = buildInvoiceData(formData, settings);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid invoice data" };
  }

  const existing = await db.invoice.findUnique({ where: { id: invoiceId }, select: { dealId: true, projectId: true, status: true } });
  if (!existing || !existing.dealId) return { error: "That invoice no longer exists." };
  if (existing.status !== "DRAFT") {
    return { error: "An issued invoice can't be edited — void it and issue a new one instead." };
  }

  const { items, ...fields } = data;
  const itemsWithCost = await withUnitCosts(items);

  const updated = await db.invoice.updateMany({
    where: { id: invoiceId, status: "DRAFT" },
    data: { ...fields, currency: settings.currency },
  });
  if (updated.count !== 1) return { error: "This invoice was just issued — refresh to see it." };
  await db.invoiceItem.deleteMany({ where: { invoiceId } });
  await db.invoiceItem.createMany({ data: itemsWithCost.map((item) => ({ ...item, invoiceId })) });
  await logDocumentEvent(db, { type: "UPDATED", invoiceId, actorId: user.id, actorLabel: user.name });

  if (isIssueIntent(formData)) {
    const issued = await issueInvoice(invoiceId);
    if (issued && "error" in issued) {
      redirect(withFlash(`/system/deals/${existing.dealId}/invoices/${invoiceId}`, `Saved — ${issued.error}`));
    }
    redirect(withFlash(`/system/deals/${existing.dealId}/invoices/${invoiceId}`, "Invoice issued."));
  }

  revalidateInvoicePaths(existing.dealId, invoiceId, existing.projectId);
  redirect(withFlash(`/system/deals/${existing.dealId}/invoices/${invoiceId}`, "Draft saved."));
}

// Only drafts can be deleted — an issued invoice carries a number the
// client may hold, so it's voided instead and stays on record.
export async function deleteDealInvoice(invoiceId: string) {
  await requireSalesAction();
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId }, select: { dealId: true, status: true } });
  if (!invoice || !invoice.dealId) redirect("/system/deals");
  if (invoice.status !== "DRAFT") {
    redirect(withFlash(`/system/deals/${invoice.dealId}/invoices/${invoiceId}`, "Only drafts can be deleted — void this invoice instead."));
  }
  const deleted = await db.invoice.deleteMany({ where: { id: invoiceId, status: "DRAFT" } });
  if (deleted.count !== 1) {
    redirect(withFlash(`/system/deals/${invoice.dealId}/invoices/${invoiceId}`, "This invoice was just issued and can no longer be deleted."));
  }
  revalidateInvoicePaths(invoice.dealId, invoiceId);
  redirect(withFlash(`/system/deals/${invoice.dealId}`, "Draft deleted."));
}

// ---------------------------------------------------------------------------
// Issue

function newShareToken() {
  return randomBytes(24).toString("base64url");
}

// DRAFT → SENT, in one transaction: allocate the number, freeze the issuer
// and bill-to snapshots, mint the share token and set the due date. The
// counter row's lock serialises concurrent issuers; the conditional
// updateMany makes a double-click a no-op rather than a second number.
export async function issueInvoice(invoiceId: string): Promise<InvoiceActionState> {
  const user = await requireSalesAction();
  const settings = await getBillingSettings();
  await ensureSequenceRow("INVOICE");

  let dealId: string | null;
  try {
    const result = await withIssueRetry(() =>
      db.$transaction(async (tx) => {
        const invoice = await tx.invoice.findUniqueOrThrow({
          where: { id: invoiceId },
          include: {
            items: { select: { id: true } },
            deal: { include: { contact: true, company: true } },
            contact: true,
          },
        });
        if (!invoice.dealId || !invoice.deal) throw new Error("Only invoices created from a deal can be issued this way.");
        if (invoice.status !== "DRAFT") throw new Error("This invoice has already been issued.");
        if (invoice.items.length === 0) throw new Error("Add at least one line item before issuing.");
        if (Number(invoice.total) < 0) throw new Error("The total can't be negative.");

        const now = new Date();
        const today = orgToday(settings.utcOffsetMinutes, now);
        // A manually-picked due date in the future wins; otherwise fall
        // back to this client's own override (Company.invoiceDueDays) and
        // finally the global Settings.invoiceDueDays.
        const defaultDueDays = invoice.deal.company?.invoiceDueDays ?? settings.invoiceDueDays;
        const dueDate = invoice.dueDate && invoice.dueDate >= today ? invoice.dueDate : addDays(today, defaultDueDays);

        const number = await allocateDocumentNumber(tx, "INVOICE", settings.invoiceNumberPrefix, settings.numberPadding);

        const contact = invoice.contact ?? invoice.deal.contact;
        const defaults = billToDefaults(contact, invoice.deal.company);
        const updated = await tx.invoice.updateMany({
          where: { id: invoiceId, status: "DRAFT" },
          data: {
            status: "SENT",
            number,
            shareToken: newShareToken(),
            issuedAt: now,
            sentAt: now,
            dueDate,
            ...issuerSnapshot(settings),
            billToName: invoice.billToName ?? (defaults.billToName || null),
            billToCompany: invoice.billToCompany ?? (defaults.billToCompany || null),
            billToRegistrationNo: invoice.billToRegistrationNo ?? (defaults.billToRegistrationNo || null),
            billToAddress: invoice.billToAddress ?? (defaults.billToAddress || null),
            billToEmail: invoice.billToEmail ?? (defaults.billToEmail || null),
          },
        });
        if (updated.count !== 1) throw new Error("This invoice has already been issued.");

        await logDocumentEvent(tx, {
          type: "ISSUED",
          invoiceId,
          actorId: user.id,
          actorLabel: user.name,
          payload: { number, dueDate: dueDate.toISOString() },
        });
        await tx.activity.create({
          data: { type: "NOTE", content: `Invoice ${number} issued: "${invoice.title}".`, dealId: invoice.dealId },
        });
        return { dealId: invoice.dealId };
      }, ISSUE_TRANSACTION_OPTIONS),
    );
    dealId = result.dealId;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { error: "That invoice no longer exists." };
    }
    return { error: error instanceof Error ? error.message : "The invoice could not be issued." };
  }

  revalidateInvoicePaths(dealId, invoiceId);
  return { success: true };
}

export async function issueInvoiceForm(invoiceId: string, _prevState: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
  void formData;
  return issueInvoice(invoiceId);
}

// ---------------------------------------------------------------------------
// Void / payment

const voidSchema = z.object({ reason: z.string().trim().max(500).optional() });

export async function voidInvoice(invoiceId: string, _prevState: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
  const user = await requireSalesAction();
  const parsed = voidSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return { error: "Reason is too long." };

  const invoice = await db.invoice.findUnique({ where: { id: invoiceId }, select: { dealId: true, status: true, number: true, title: true } });
  if (!invoice || !invoice.dealId) return { error: "That invoice no longer exists." };
  if (invoice.status === "DRAFT") return { error: "Drafts aren't issued yet — delete it instead." };
  if (invoice.status === "PAID_IN_FULL") return { error: "A paid invoice can't be voided." };
  if (invoice.status === "VOID") return { error: "This invoice is already void." };

  const updated = await db.invoice.updateMany({
    where: { id: invoiceId, status: { in: ["SENT", "VIEWED"] } },
    data: { status: "VOID", voidedAt: new Date() },
  });
  if (updated.count !== 1) return { error: "This invoice changed — refresh and try again." };
  await logDocumentEvent(db, {
    type: "VOIDED",
    invoiceId,
    actorId: user.id,
    actorLabel: user.name,
    payload: parsed.data.reason ? { reason: parsed.data.reason } : null,
  });
  await db.activity.create({
    data: {
      type: "NOTE",
      content: `Invoice ${invoice.number ? `${invoice.number} ` : ""}"${invoice.title}" voided${parsed.data.reason ? `: ${parsed.data.reason}` : "."}`,
      dealId: invoice.dealId,
    },
  });

  revalidateInvoicePaths(invoice.dealId, invoiceId);
  return { success: true };
}

const markPaidSchema = z.object({ reference: z.string().trim().max(191).optional() });

// Staff logging that payment came in — this app has no payment gateway of
// its own, so "paid" is always a manual confirmation (a bank transfer
// reference, a receipt number, or nothing at all).
export async function markInvoicePaid(invoiceId: string, _prevState: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
  const user = await requireSalesAction();
  const parsed = markPaidSchema.safeParse({ reference: formData.get("reference") });
  if (!parsed.success) return { error: "Reference is too long." };

  const invoice = await db.invoice.findUnique({ where: { id: invoiceId }, select: { dealId: true, status: true, number: true, title: true } });
  if (!invoice || !invoice.dealId) return { error: "That invoice no longer exists." };
  if (invoice.status === "DRAFT") return { error: "Issue the invoice before recording a payment." };
  if (invoice.status === "VOID") return { error: "A voided invoice can't be marked paid." };
  if (invoice.status === "PAID_IN_FULL") return { error: "This invoice is already marked paid." };

  const updated = await db.invoice.updateMany({
    where: { id: invoiceId, status: { in: ["SENT", "VIEWED"] } },
    data: { status: "PAID_IN_FULL", paidAt: new Date() },
  });
  if (updated.count !== 1) return { error: "This invoice changed — refresh and try again." };
  await logDocumentEvent(db, {
    type: "PAID",
    invoiceId,
    actorId: user.id,
    actorLabel: user.name,
    payload: parsed.data.reference ? { reference: parsed.data.reference } : null,
  });
  await db.activity.create({
    data: {
      type: "NOTE",
      content: `Invoice ${invoice.number ? `${invoice.number} ` : ""}"${invoice.title}" marked paid.`,
      dealId: invoice.dealId,
    },
  });

  revalidateInvoicePaths(invoice.dealId, invoiceId);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Public page — no session. /i/[key] takes the share token minted at issue.

function shareKeyWhere(key: string): Prisma.InvoiceWhereInput {
  return { OR: [{ shareToken: key }, { id: key, shareToken: null }], status: { not: "DRAFT" }, dealId: { not: null } };
}

// Called from the public invoice page on first render — a real visitor, not
// a logged-in user, so this deliberately skips any auth check.
export async function recordInvoiceView(key: string) {
  const invoice = await db.invoice.findFirst({
    where: shareKeyWhere(key),
    select: { id: true, status: true, firstViewedAt: true, dealId: true },
  });
  if (!invoice) return;

  const now = new Date();
  const nextStatus: InvoiceStatus = invoice.status === "SENT" ? "VIEWED" : invoice.status;
  await db.invoice.update({
    where: { id: invoice.id },
    data: { status: nextStatus, firstViewedAt: invoice.firstViewedAt ?? now, lastViewedAt: now, viewCount: { increment: 1 } },
  });
  if (!invoice.firstViewedAt) {
    await logDocumentEvent(db, { type: "VIEWED", invoiceId: invoice.id, actorLabel: "Client" });
    revalidateInvoicePaths(invoice.dealId, invoice.id);
  }
}

// ---------------------------------------------------------------------------
// Convert an accepted quote into an invoice draft

export async function convertQuoteToInvoice(quoteId: string) {
  const user = await requireSalesAction();
  const settings = await getBillingSettings();
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!quote) redirect("/system/deals");
  if (quote.status !== "ACCEPTED") {
    redirect(withFlash(`/system/deals/${quote.dealId}/quotes/${quoteId}`, "Only an accepted quote can be converted to an invoice."));
  }

  const totals = computeTotals(
    quote.items.map((item) => ({ quantity: item.quantity.toString(), unitPrice: item.unitPrice.toString(), taxable: item.taxable })),
    { discountType: quote.discountType, discountValue: quote.discountValue.toString(), taxRate: settings.taxRate },
  );

  const invoice = await db.invoice.create({
    data: {
      title: quote.title,
      notes: settings.defaultInvoiceNotes,
      dealId: quote.dealId,
      contactId: quote.contactId,
      currency: settings.currency,
      discountType: quote.discountType,
      discountValue: quote.discountValue,
      subtotal: normalizeMoney(totals.subtotal),
      discountAmount: normalizeMoney(totals.discountAmount),
      taxLabel: settings.taxLabel,
      taxRate: normalizeMoney(settings.taxRate),
      taxAmount: normalizeMoney(totals.taxAmount),
      total: normalizeMoney(totals.total),
      amount: normalizeMoney(totals.total),
      billToName: quote.billToName,
      billToCompany: quote.billToCompany,
      billToRegistrationNo: quote.billToRegistrationNo,
      billToAddress: quote.billToAddress,
      billToEmail: quote.billToEmail,
      fromQuoteId: quote.id,
      items: {
        create: quote.items.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: item.unit,
          taxable: item.taxable,
          lineTotal: normalizeMoney(totals.lineTotals[index]),
          unitCost: item.unitCost,
          servicePackageId: item.servicePackageId,
          sortOrder: index,
        })),
      },
    } satisfies Prisma.InvoiceUncheckedCreateInput,
    select: { id: true },
  });
  await logDocumentEvent(db, { type: "CREATED", invoiceId: invoice.id, actorId: user.id, actorLabel: user.name, payload: { fromQuoteId: quote.id } });
  await db.quote.update({ where: { id: quote.id }, data: { convertedAt: new Date() } });
  await logDocumentEvent(db, { type: "CONVERTED", quoteId: quote.id, actorId: user.id, actorLabel: user.name, payload: { invoiceId: invoice.id } });
  await db.activity.create({
    data: { type: "NOTE", content: `Quote ${quote.number ?? quote.title} converted to a draft invoice.`, dealId: quote.dealId },
  });

  revalidateInvoicePaths(quote.dealId, invoice.id);
  redirect(withFlash(`/system/deals/${quote.dealId}/invoices/${invoice.id}/edit`, "Invoice drafted from the accepted quote — review and issue it when ready."));
}
