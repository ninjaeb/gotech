"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePartnerAction } from "@/lib/auth/dal";
import { PARTNER_DEAL_STATUSES } from "@/lib/labels";
import type { PartnerDealStatus } from "@/generated/prisma/client";

const dealSchema = z.object({
  title: z.string().trim().min(1, "Deal title is required"),
  value: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : "0"))
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, { message: "Enter a value of 0 or more" }),
  status: z
    .string()
    .trim()
    .refine((value) => PARTNER_DEAL_STATUSES.includes(value as PartnerDealStatus), { message: "Invalid status" }),
  companyId: z.string().trim().optional(),
  contactId: z.string().trim().optional(),
  expectedCloseDate: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type PartnerDealFormValues = {
  title: string;
  value: string;
  status: string;
  companyId: string;
  contactId: string;
  expectedCloseDate: string;
  notes: string;
};

function stringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function extractDealFormValues(formData: FormData): PartnerDealFormValues {
  return {
    title: stringField(formData, "title"),
    value: stringField(formData, "value"),
    status: stringField(formData, "status") || "OPEN",
    companyId: stringField(formData, "companyId"),
    contactId: stringField(formData, "contactId"),
    expectedCloseDate: stringField(formData, "expectedCloseDate"),
    notes: stringField(formData, "notes"),
  };
}

export type PartnerDealFormState = { error: string; values: PartnerDealFormValues } | undefined;

type ParsedDealForm =
  | { success: false; error: string }
  | {
      success: true;
      data: {
        title: string;
        value: string;
        status: PartnerDealStatus;
        companyId: string | null;
        contactId: string | null;
        expectedCloseDate: Date | null;
        notes: string | null;
      };
    };

// companyId/contactId are reconciled against rows this partner actually
// owns rather than trusted as-is — same convention as parseContactForm in
// src/app/actions/partner-contacts.ts.
async function parseDealForm(formData: FormData, partnerId: string): Promise<ParsedDealForm> {
  const parsed = dealSchema.safeParse({
    title: formData.get("title"),
    value: formData.get("value"),
    status: formData.get("status") || "OPEN",
    companyId: formData.get("companyId"),
    contactId: formData.get("contactId"),
    expectedCloseDate: formData.get("expectedCloseDate"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid deal data" };
  }
  const data = parsed.data;
  const [company, contact] = await Promise.all([
    data.companyId ? db.partnerCompany.findFirst({ where: { id: data.companyId, partnerId }, select: { id: true } }) : null,
    data.contactId ? db.partnerContact.findFirst({ where: { id: data.contactId, partnerId }, select: { id: true } }) : null,
  ]);
  return {
    success: true,
    data: {
      title: data.title,
      value: data.value,
      status: data.status as PartnerDealStatus,
      companyId: company?.id ?? null,
      contactId: contact?.id ?? null,
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
      notes: data.notes || null,
    },
  };
}

// wonAt/lostAt are set once (not overwritten if already set) the same way
// Deal.wonAt is only ever refreshed by an actual stage change, so re-saving
// a still-WON deal doesn't silently move its close date forward.
function closeDatesFor(status: PartnerDealStatus, existing?: { wonAt: Date | null; lostAt: Date | null }) {
  if (status === "WON") return { wonAt: existing?.wonAt ?? new Date(), lostAt: null };
  if (status === "LOST") return { wonAt: null, lostAt: existing?.lostAt ?? new Date() };
  return { wonAt: null, lostAt: null };
}

export async function createPartnerDeal(
  _prevState: PartnerDealFormState,
  formData: FormData,
): Promise<PartnerDealFormState> {
  const partner = await requirePartnerAction();
  const parsed = await parseDealForm(formData, partner.id);
  if (!parsed.success) return { error: parsed.error, values: extractDealFormValues(formData) };
  const deal = await db.partnerDeal.create({
    data: { ...parsed.data, partnerId: partner.id, ...closeDatesFor(parsed.data.status) },
  });
  revalidatePath("/business-portal/deals");
  redirect(`/business-portal/deals/${deal.id}`);
}

export async function updatePartnerDeal(
  id: string,
  _prevState: PartnerDealFormState,
  formData: FormData,
): Promise<PartnerDealFormState> {
  const partner = await requirePartnerAction();
  const existing = await db.partnerDeal.findFirst({ where: { id, partnerId: partner.id } });
  if (!existing) return { error: "Deal not found.", values: extractDealFormValues(formData) };
  const parsed = await parseDealForm(formData, partner.id);
  if (!parsed.success) return { error: parsed.error, values: extractDealFormValues(formData) };
  await db.partnerDeal.update({
    where: { id },
    data: { ...parsed.data, ...closeDatesFor(parsed.data.status, existing) },
  });
  revalidatePath("/business-portal/deals");
  revalidatePath(`/business-portal/deals/${id}`);
  redirect(`/business-portal/deals/${id}`);
}

export async function deletePartnerDeal(id: string, formData: FormData) {
  void formData;
  const partner = await requirePartnerAction();
  const existing = await db.partnerDeal.findFirst({ where: { id, partnerId: partner.id } });
  if (!existing) throw new Error("Deal not found.");
  await db.partnerDeal.delete({ where: { id } });
  revalidatePath("/business-portal/deals");
  redirect("/business-portal/deals");
}
