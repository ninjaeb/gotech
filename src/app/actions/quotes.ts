"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma, type AcceptedVia, type Quote, type QuoteStatus } from "@/generated/prisma/client";
import { requireSalesAction } from "@/lib/auth/dal";
import { getBillingSettings, type BillingSettings } from "@/lib/settings";
import { computeTotals, normalizeMoney } from "@/lib/documents/money";
import { addDays, isQuoteOpen, orgToday, toDateOnly } from "@/lib/documents/dates";
import { billToSchema, discountSchema, firstIssueMessage, lineItemSchema, parseItemsJson } from "@/lib/documents/schemas";
import {
  allocateDocumentNumber,
  ensureSequenceRow,
  ISSUE_TRANSACTION_OPTIONS,
  withIssueRetry,
} from "@/lib/documents/numbering";
import { logDocumentEvent } from "@/lib/documents/events";
import { revalidateQuotePaths } from "@/lib/documents/revalidate";
import { billToDefaults, issuerSnapshot } from "@/lib/documents/snapshots";
import { STAFF_ACCEPTED_VIAS } from "@/lib/labels";
import { syncReferralCommissionForDeal } from "@/lib/referrals";
import { withFlash } from "@/lib/utils";

export type QuoteFormState = { error: string } | undefined;
export type QuoteActionState = { error: string } | { success: true } | undefined;

// ---------------------------------------------------------------------------
// Draft form parsing — shared by create/update. Totals are computed here, on
// the server, from the posted strings; the client preview uses the same
// computeTotals so the two can't disagree.

const quoteFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(191),
  notes: z.string().trim().max(10000).optional(),
  contactId: z.string().trim().optional(),
  validUntil: z.string().trim().optional(),
  items: z.array(lineItemSchema).min(1, "Add at least one line item"),
});

type ParsedQuoteForm = ReturnType<typeof buildQuoteData>;

function buildQuoteData(formData: FormData, settings: BillingSettings) {
  const base = quoteFormSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes"),
    contactId: formData.get("contactId"),
    validUntil: formData.get("validUntil"),
    items: parseItemsJson(formData),
  });
  if (!base.success) throw new Error(firstIssueMessage(base.error, "Invalid quote data"));

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

  let validUntil: Date | null = null;
  if (base.data.validUntil) {
    validUntil = toDateOnly(base.data.validUntil);
    if (!validUntil) throw new Error("Valid-until must be a date");
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
    validUntil,
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
// once per save rather than trusted from the form.
async function withUnitCosts(items: ParsedQuoteForm["items"]) {
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

export async function createQuote(dealId: string, _prevState: QuoteFormState, formData: FormData): Promise<QuoteFormState> {
  const user = await requireSalesAction();
  const settings = await getBillingSettings();
  let data: ParsedQuoteForm;
  try {
    data = buildQuoteData(formData, settings);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid quote data" };
  }

  const deal = await db.deal.findUnique({ where: { id: dealId }, select: { id: true, contactId: true } });
  if (!deal) return { error: "That deal no longer exists." };

  const { items, ...fields } = data;
  const itemsWithCost = await withUnitCosts(items);

  const quote = await db.quote.create({
    data: {
      ...fields,
      contactId: fields.contactId ?? deal.contactId,
      currency: settings.currency,
      dealId,
      items: { create: itemsWithCost },
    },
    select: { id: true },
  });
  await logDocumentEvent(db, { type: "CREATED", quoteId: quote.id, actorId: user.id, actorLabel: user.name });

  if (isIssueIntent(formData)) {
    const issued = await issueQuote(quote.id);
    if (issued && "error" in issued) {
      revalidateQuotePaths(dealId, quote.id);
      redirect(withFlash(`/system/deals/${dealId}/quotes/${quote.id}`, `Saved as a draft — ${issued.error}`));
    }
    redirect(withFlash(`/system/deals/${dealId}/quotes/${quote.id}`, "Quote issued."));
  }

  revalidateQuotePaths(dealId, quote.id);
  redirect(withFlash(`/system/deals/${dealId}/quotes/${quote.id}`, "Draft saved."));
}

export async function updateQuote(quoteId: string, _prevState: QuoteFormState, formData: FormData): Promise<QuoteFormState> {
  const user = await requireSalesAction();
  const settings = await getBillingSettings();
  let data: ParsedQuoteForm;
  try {
    data = buildQuoteData(formData, settings);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid quote data" };
  }

  const existing = await db.quote.findUnique({ where: { id: quoteId }, select: { dealId: true, status: true } });
  if (!existing) return { error: "That quote no longer exists." };
  if (existing.status !== "DRAFT") {
    return { error: "An issued quote can't be edited — create a revision instead." };
  }

  const { items, ...fields } = data;
  const itemsWithCost = await withUnitCosts(items);

  // The status guard is repeated in the WHERE so a concurrent issue can't
  // slip an edit onto a number the client already has.
  const updated = await db.quote.updateMany({
    where: { id: quoteId, status: "DRAFT" },
    data: { ...fields, currency: settings.currency },
  });
  if (updated.count !== 1) return { error: "This quote was just issued — refresh to see it." };
  await db.quoteItem.deleteMany({ where: { quoteId } });
  await db.quoteItem.createMany({ data: itemsWithCost.map((item) => ({ ...item, quoteId })) });
  await logDocumentEvent(db, { type: "UPDATED", quoteId, actorId: user.id, actorLabel: user.name });

  if (isIssueIntent(formData)) {
    const issued = await issueQuote(quoteId);
    if (issued && "error" in issued) {
      redirect(withFlash(`/system/deals/${existing.dealId}/quotes/${quoteId}`, `Saved — ${issued.error}`));
    }
    redirect(withFlash(`/system/deals/${existing.dealId}/quotes/${quoteId}`, "Quote issued."));
  }

  revalidateQuotePaths(existing.dealId, quoteId);
  redirect(withFlash(`/system/deals/${existing.dealId}/quotes/${quoteId}`, "Draft saved."));
}

// Only drafts can be deleted — an issued quote carries a number the client
// may hold, so it's withdrawn instead and stays on record.
export async function deleteQuote(quoteId: string) {
  await requireSalesAction();
  const quote = await db.quote.findUnique({ where: { id: quoteId }, select: { dealId: true, status: true } });
  if (!quote) redirect("/system/deals");
  if (quote.status !== "DRAFT") {
    redirect(withFlash(`/system/deals/${quote.dealId}/quotes/${quoteId}`, "Only drafts can be deleted — withdraw this quote instead."));
  }
  const deleted = await db.quote.deleteMany({ where: { id: quoteId, status: "DRAFT" } });
  if (deleted.count !== 1) {
    redirect(withFlash(`/system/deals/${quote.dealId}/quotes/${quoteId}`, "This quote was just issued and can no longer be deleted."));
  }
  revalidateQuotePaths(quote.dealId, quoteId);
  redirect(withFlash(`/system/deals/${quote.dealId}`, "Draft deleted."));
}

// ---------------------------------------------------------------------------
// Issue

function newShareToken() {
  return randomBytes(24).toString("base64url");
}

// DRAFT → SENT, in one transaction: allocate (or inherit) the number, freeze
// the issuer and bill-to snapshots, mint the share token and set the
// validity date. The counter row's lock serialises concurrent issuers; the
// conditional updateMany makes a double-click a no-op rather than a second
// number.
export async function issueQuote(quoteId: string): Promise<QuoteActionState> {
  const user = await requireSalesAction();
  const settings = await getBillingSettings();
  await ensureSequenceRow("QUOTE");

  let dealId: string;
  let numberLabel: string;
  try {
    const result = await withIssueRetry(() =>
      db.$transaction(async (tx) => {
        const quote = await tx.quote.findUniqueOrThrow({
          where: { id: quoteId },
          include: {
            items: { select: { id: true } },
            revisionOf: { select: { id: true, number: true, status: true, withdrawnAt: true, supersededById: true } },
            deal: { include: { contact: true, company: true } },
            contact: true,
          },
        });
        if (quote.status !== "DRAFT") throw new Error("This quote has already been issued.");
        if (quote.items.length === 0) throw new Error("Add at least one line item before issuing.");
        if (Number(quote.total) < 0) throw new Error("The total can't be negative.");

        const now = new Date();
        const today = orgToday(settings.utcOffsetMinutes, now);
        const validUntil = quote.validUntil && quote.validUntil >= today ? quote.validUntil : addDays(today, settings.quoteValidityDays);

        // A revision keeps its parent's root number and takes the next
        // revision slot for it; anything else gets a fresh number.
        let number: string;
        let revision = 1;
        const root = quote.revisionOf?.number ?? null;
        if (root) {
          number = root;
          const latest = await tx.quote.aggregate({ where: { number: root }, _max: { revision: true } });
          revision = (latest._max.revision ?? 1) + 1;
        } else {
          number = await allocateDocumentNumber(tx, "QUOTE", settings.quoteNumberPrefix, settings.numberPadding);
        }

        const contact = quote.contact ?? quote.deal.contact;
        const defaults = billToDefaults(contact, quote.deal.company);
        const updated = await tx.quote.updateMany({
          where: { id: quoteId, status: "DRAFT" },
          data: {
            status: "SENT",
            number,
            revision,
            shareToken: newShareToken(),
            issuedAt: now,
            sentAt: now,
            validUntil,
            ...issuerSnapshot(settings),
            billToName: quote.billToName ?? (defaults.billToName || null),
            billToCompany: quote.billToCompany ?? (defaults.billToCompany || null),
            billToRegistrationNo: quote.billToRegistrationNo ?? (defaults.billToRegistrationNo || null),
            billToAddress: quote.billToAddress ?? (defaults.billToAddress || null),
            billToEmail: quote.billToEmail ?? (defaults.billToEmail || null),
          },
        });
        if (updated.count !== 1) throw new Error("This quote has already been issued.");

        const label = revision > 1 ? `${number} Rev ${revision}` : number;
        await logDocumentEvent(tx, {
          type: "ISSUED",
          quoteId,
          actorId: user.id,
          actorLabel: user.name,
          payload: { number, revision, validUntil: validUntil.toISOString() },
        });

        // Issuing a revision retires a merely sent/viewed parent right away.
        // An accepted parent stays the contract until the client accepts the
        // new one (see finalizeResponse).
        const parent = quote.revisionOf;
        if (parent && !parent.supersededById && (parent.status === "SENT" || parent.status === "VIEWED")) {
          await tx.quote.update({ where: { id: parent.id }, data: { supersededById: quoteId } });
          await logDocumentEvent(tx, {
            type: "SUPERSEDED",
            quoteId: parent.id,
            actorId: user.id,
            actorLabel: user.name,
            payload: { byQuoteId: quoteId, revision },
          });
        }

        await tx.activity.create({
          data: { type: "NOTE", content: `Quote ${label} issued: "${quote.title}".`, dealId: quote.dealId },
        });
        return { dealId: quote.dealId, label };
      }, ISSUE_TRANSACTION_OPTIONS),
    );
    dealId = result.dealId;
    numberLabel = result.label;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { error: "That quote no longer exists." };
    }
    return { error: error instanceof Error ? error.message : "The quote could not be issued." };
  }

  void numberLabel;
  revalidateQuotePaths(dealId, quoteId);
  return { success: true };
}

export async function issueQuoteForm(quoteId: string, _prevState: QuoteActionState, formData: FormData): Promise<QuoteActionState> {
  void formData;
  return issueQuote(quoteId);
}

// ---------------------------------------------------------------------------
// Revisions, duplicates

type CloneSource = Prisma.QuoteGetPayload<{ include: { items: true } }>;

function cloneFields(source: CloneSource, settings: BillingSettings) {
  const totals = computeTotals(
    source.items.map((item) => ({ quantity: item.quantity.toString(), unitPrice: item.unitPrice.toString(), taxable: item.taxable })),
    { discountType: source.discountType, discountValue: source.discountValue.toString(), taxRate: settings.taxRate },
  );
  return {
    data: {
      title: source.title,
      notes: source.notes,
      dealId: source.dealId,
      contactId: source.contactId,
      currency: settings.currency,
      discountType: source.discountType,
      discountValue: source.discountValue,
      subtotal: normalizeMoney(totals.subtotal),
      discountAmount: normalizeMoney(totals.discountAmount),
      taxLabel: settings.taxLabel,
      taxRate: normalizeMoney(settings.taxRate),
      taxAmount: normalizeMoney(totals.taxAmount),
      total: normalizeMoney(totals.total),
      billToName: source.billToName,
      billToCompany: source.billToCompany,
      billToRegistrationNo: source.billToRegistrationNo,
      billToAddress: source.billToAddress,
      billToEmail: source.billToEmail,
      items: {
        create: source.items.map((item, index) => ({
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
    } satisfies Prisma.QuoteUncheckedCreateInput,
  };
}

// A new draft that will carry the same number as this one ("Q-0012 Rev 2").
export async function reviseQuote(quoteId: string) {
  const user = await requireSalesAction();
  const settings = await getBillingSettings();
  const source = await db.quote.findUnique({ where: { id: quoteId }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  if (!source) redirect("/system/deals");
  if (source.status === "DRAFT") {
    redirect(withFlash(`/system/deals/${source.dealId}/quotes/${quoteId}/edit`, "Drafts are edited directly — no revision needed."));
  }

  const { data } = cloneFields(source, settings);
  const revision = await db.quote.create({
    data: { ...data, revisionOfId: source.id, revision: source.revision + 1 },
    select: { id: true },
  });
  await logDocumentEvent(db, { type: "REVISED", quoteId: source.id, actorId: user.id, actorLabel: user.name, payload: { revisionId: revision.id } });
  await logDocumentEvent(db, { type: "CREATED", quoteId: revision.id, actorId: user.id, actorLabel: user.name, payload: { revisionOf: source.id } });

  revalidateQuotePaths(source.dealId, quoteId);
  redirect(withFlash(`/system/deals/${source.dealId}/quotes/${revision.id}/edit`, "Revision drafted — edit and issue it when ready."));
}

// A fresh, unrelated draft with the same lines (new number at issue).
export async function duplicateQuote(quoteId: string) {
  const user = await requireSalesAction();
  const settings = await getBillingSettings();
  const source = await db.quote.findUnique({ where: { id: quoteId }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  if (!source) redirect("/system/deals");

  const { data } = cloneFields(source, settings);
  const copy = await db.quote.create({ data: { ...data, title: `${source.title} (copy)` }, select: { id: true } });
  await logDocumentEvent(db, { type: "CREATED", quoteId: copy.id, actorId: user.id, actorLabel: user.name, payload: { duplicatedFrom: source.id } });

  revalidateQuotePaths(source.dealId);
  redirect(withFlash(`/system/deals/${source.dealId}/quotes/${copy.id}/edit`, "Quote duplicated as a new draft."));
}

// ---------------------------------------------------------------------------
// Withdraw / extend

const withdrawSchema = z.object({ reason: z.string().trim().max(500).optional() });

export async function withdrawQuote(quoteId: string, _prevState: QuoteActionState, formData: FormData): Promise<QuoteActionState> {
  const user = await requireSalesAction();
  const parsed = withdrawSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return { error: "Reason is too long." };

  const quote = await db.quote.findUnique({ where: { id: quoteId }, select: { dealId: true, status: true, withdrawnAt: true, number: true, title: true } });
  if (!quote) return { error: "That quote no longer exists." };
  if (quote.status === "DRAFT") return { error: "Drafts aren't issued yet — delete it instead." };
  if (quote.status === "ACCEPTED") return { error: "An accepted quote can't be withdrawn — issue a revision instead." };
  if (quote.withdrawnAt) return { error: "This quote is already withdrawn." };

  const updated = await db.quote.updateMany({
    where: { id: quoteId, withdrawnAt: null, status: { in: ["SENT", "VIEWED", "DECLINED"] } },
    data: { withdrawnAt: new Date() },
  });
  if (updated.count !== 1) return { error: "This quote changed — refresh and try again." };
  await logDocumentEvent(db, {
    type: "WITHDRAWN",
    quoteId,
    actorId: user.id,
    actorLabel: user.name,
    payload: parsed.data.reason ? { reason: parsed.data.reason } : null,
  });
  await db.activity.create({
    data: {
      type: "NOTE",
      content: `Quote ${quote.number ? `${quote.number} ` : ""}"${quote.title}" withdrawn${parsed.data.reason ? `: ${parsed.data.reason}` : "."}`,
      dealId: quote.dealId,
    },
  });

  revalidateQuotePaths(quote.dealId, quoteId);
  return { success: true };
}

export async function extendQuoteValidity(quoteId: string, _prevState: QuoteActionState, formData: FormData): Promise<QuoteActionState> {
  const user = await requireSalesAction();
  const settings = await getBillingSettings();
  const validUntil = toDateOnly(String(formData.get("validUntil") || ""));
  if (!validUntil) return { error: "Pick a date." };
  if (validUntil < orgToday(settings.utcOffsetMinutes)) return { error: "The new date can't be in the past." };

  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    select: { dealId: true, status: true, withdrawnAt: true, supersededById: true, validUntil: true },
  });
  if (!quote) return { error: "That quote no longer exists." };
  if (quote.status !== "SENT" && quote.status !== "VIEWED") return { error: "Only an open quote's validity can be changed." };
  if (quote.withdrawnAt || quote.supersededById) return { error: "This quote is no longer open." };

  await db.quote.update({ where: { id: quoteId }, data: { validUntil } });
  await logDocumentEvent(db, {
    type: "VALIDITY_EXTENDED",
    quoteId,
    actorId: user.id,
    actorLabel: user.name,
    payload: { from: quote.validUntil?.toISOString() ?? null, to: validUntil.toISOString() },
  });

  revalidateQuotePaths(quote.dealId, quoteId);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Responses — the client's own click (public page) or staff logging an
// offline answer. Both funnel through finalizeResponse so acceptance always
// has the same side effects.

type ResponseMeta = {
  acceptedVia: AcceptedVia;
  acceptedByName: string | null;
  acceptedByEmail: string | null;
  acceptedReference: string | null;
  actorId: string | null;
  actorLabel: string | null;
};

type ResponseQuote = Pick<Quote, "id" | "title" | "dealId" | "number" | "revision" | "total" | "revisionOfId">;

// The status flip itself, guarded so two clients (or a client and a staff
// member) can't both "win": only an open SENT/VIEWED row transitions.
async function applyResponse(quote: ResponseQuote, decision: "ACCEPTED" | "DECLINED", meta: ResponseMeta) {
  const now = new Date();
  const flipped = await db.quote.updateMany({
    where: { id: quote.id, status: { in: ["SENT", "VIEWED"] }, withdrawnAt: null, supersededById: null },
    data: {
      status: decision,
      respondedAt: now,
      acceptedVia: meta.acceptedVia,
      acceptedByName: meta.acceptedByName,
      acceptedByEmail: meta.acceptedByEmail,
      acceptedReference: meta.acceptedReference,
    },
  });
  if (flipped.count !== 1) return false;
  await finalizeResponse(quote, decision, meta);
  return true;
}

async function finalizeResponse(quote: ResponseQuote, decision: "ACCEPTED" | "DECLINED", meta: ResponseMeta) {
  const label = quote.number ? (quote.revision > 1 ? `${quote.number} Rev ${quote.revision}` : quote.number) : `"${quote.title}"`;
  await logDocumentEvent(db, {
    type: decision,
    quoteId: quote.id,
    actorId: meta.actorId,
    actorLabel: meta.actorLabel ?? meta.acceptedByName ?? "Client",
    payload: { via: meta.acceptedVia, name: meta.acceptedByName, reference: meta.acceptedReference },
  });
  const who = meta.actorLabel ? `recorded by ${meta.actorLabel}` : `by ${meta.acceptedByName ?? "the client"}`;
  await db.activity.create({
    data: {
      type: "NOTE",
      content: `Quote ${label} was ${decision === "ACCEPTED" ? "accepted" : "declined"} ${who}.`,
      dealId: quote.dealId,
    },
  });

  if (decision !== "ACCEPTED") return;

  // Accepting a revision of an accepted quote makes the revision the
  // contract; the old one is marked superseded now rather than at issue.
  if (quote.revisionOfId) {
    const parent = await db.quote.findUnique({ where: { id: quote.revisionOfId }, select: { id: true, supersededById: true } });
    if (parent && !parent.supersededById) {
      await db.quote.update({ where: { id: parent.id }, data: { supersededById: quote.id } });
      await logDocumentEvent(db, {
        type: "SUPERSEDED",
        quoteId: parent.id,
        actorId: meta.actorId,
        actorLabel: meta.actorLabel,
        payload: { byQuoteId: quote.id, revision: quote.revision },
      });
    }
  }
  await applyQuoteValueToDeal(quote, meta);
}

// Deal.value is what the leaderboard and referral commissions read, so an
// accepted quote's total becomes the deal's value (Settings → Billing can
// turn this off).
async function applyQuoteValueToDeal(quote: ResponseQuote, meta: ResponseMeta) {
  const settings = await getBillingSettings();
  if (!settings.syncDealValueFromAcceptedQuote) return;
  const deal = await db.deal.findUnique({
    where: { id: quote.dealId },
    select: { id: true, value: true, pipelineStage: { select: { isWon: true } } },
  });
  if (!deal) return;
  const from = deal.value.toString();
  const to = quote.total.toString();
  if (from === to) return;
  await db.deal.update({ where: { id: deal.id }, data: { value: to } });
  await logDocumentEvent(db, {
    type: "DEAL_VALUE_SYNCED",
    quoteId: quote.id,
    actorId: meta.actorId,
    actorLabel: meta.actorLabel,
    payload: { from, to },
  });
  await syncReferralCommissionForDeal(deal.id, deal.pipelineStage.isWon);
}

const staffResponseSchema = z.object({
  decision: z.enum(["ACCEPTED", "DECLINED"]),
  acceptedVia: z.enum(STAFF_ACCEPTED_VIAS as [AcceptedVia, ...AcceptedVia[]]),
  acceptedByName: z.string().trim().max(191).optional(),
  acceptedReference: z.string().trim().max(191).optional(),
});

// Staff logging a yes/no that arrived outside the link — WhatsApp, a signed
// PO, an email reply.
export async function markQuoteResponse(quoteId: string, _prevState: QuoteActionState, formData: FormData): Promise<QuoteActionState> {
  const user = await requireSalesAction();
  const settings = await getBillingSettings();
  const parsed = staffResponseSchema.safeParse({
    decision: formData.get("decision"),
    acceptedVia: formData.get("acceptedVia"),
    acceptedByName: formData.get("acceptedByName"),
    acceptedReference: formData.get("acceptedReference"),
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error, "Invalid response") };

  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    select: { id: true, title: true, dealId: true, number: true, revision: true, total: true, revisionOfId: true, status: true, validUntil: true, withdrawnAt: true, supersededById: true },
  });
  if (!quote) return { error: "That quote no longer exists." };
  if (quote.status === "DRAFT") return { error: "Issue the quote before recording a response." };
  if (!isQuoteOpen(quote, settings.utcOffsetMinutes)) {
    return { error: "This quote is no longer open — extend its validity or issue a revision first." };
  }

  const ok = await applyResponse(quote, parsed.data.decision, {
    acceptedVia: parsed.data.acceptedVia,
    acceptedByName: parsed.data.acceptedByName || null,
    acceptedByEmail: null,
    acceptedReference: parsed.data.acceptedReference || null,
    actorId: user.id,
    actorLabel: user.name,
  });
  if (!ok) return { error: "This quote was just answered — refresh to see it." };

  revalidateQuotePaths(quote.dealId, quoteId);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Public page — no session. /q/[key] takes the share token minted at issue;
// quotes shared before tokens existed are still reachable by id, but a row
// that HAS a token is never resolvable by id.

function shareKeyWhere(key: string): Prisma.QuoteWhereInput {
  return { OR: [{ shareToken: key }, { id: key, shareToken: null }], status: { not: "DRAFT" } };
}

// Called from the public quote page on first render — a real visitor, not a
// logged-in user, so this deliberately skips any auth check.
export async function recordQuoteView(key: string) {
  const quote = await db.quote.findFirst({
    where: shareKeyWhere(key),
    select: { id: true, status: true, firstViewedAt: true, dealId: true },
  });
  if (!quote) return;

  const now = new Date();
  const nextStatus: QuoteStatus = quote.status === "SENT" ? "VIEWED" : quote.status;
  await db.quote.update({
    where: { id: quote.id },
    data: { status: nextStatus, firstViewedAt: quote.firstViewedAt ?? now, lastViewedAt: now, viewCount: { increment: 1 } },
  });
  if (!quote.firstViewedAt) {
    await logDocumentEvent(db, { type: "VIEWED", quoteId: quote.id, actorLabel: "Client" });
    revalidateQuotePaths(quote.dealId, quote.id);
  }
}

const publicResponseSchema = z.object({
  decision: z.enum(["ACCEPTED", "DECLINED"]),
  name: z.string().trim().max(191).optional(),
  email: z.string().trim().max(191).optional(),
  agreed: z.boolean(),
});

export type PublicResponseInput = { decision: "ACCEPTED" | "DECLINED"; name?: string; email?: string; agreed: boolean };

// Also called from the public quote page — the client accepting or
// declining, not a logged-in user.
export async function respondToQuote(key: string, input: PublicResponseInput): Promise<{ error: string } | undefined> {
  const parsed = publicResponseSchema.safeParse(input);
  if (!parsed.success) return { error: "Please check your details and try again." };
  if (parsed.data.decision === "ACCEPTED") {
    if (!parsed.data.name) return { error: "Please enter your name to accept." };
    if (!parsed.data.agreed) return { error: "Please confirm you agree to the terms." };
  }

  const settings = await getBillingSettings();
  const quote = await db.quote.findFirst({
    where: shareKeyWhere(key),
    select: { id: true, title: true, dealId: true, number: true, revision: true, total: true, revisionOfId: true, status: true, validUntil: true, withdrawnAt: true, supersededById: true },
  });
  if (!quote) return { error: "This quote is no longer available." };
  if (!isQuoteOpen(quote, settings.utcOffsetMinutes)) {
    return { error: "This quote is no longer open. Contact us if you'd like an updated one." };
  }

  const ok = await applyResponse(quote, parsed.data.decision, {
    acceptedVia: "LINK",
    acceptedByName: parsed.data.name || null,
    acceptedByEmail: parsed.data.email || null,
    acceptedReference: null,
    actorId: null,
    actorLabel: null,
  });
  if (!ok) return { error: "This quote has already been answered." };

  revalidateQuotePaths(quote.dealId, quote.id);
  return undefined;
}
