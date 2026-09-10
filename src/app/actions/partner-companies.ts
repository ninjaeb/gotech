"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePartnerAction } from "@/lib/auth/dal";
import { isValidPhoneFormat, normalizePhone, PHONE_FORMAT_HINT } from "@/lib/phone";
import type { Industry } from "@/generated/prisma/client";

const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  industry: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || isValidPhoneFormat(value), { message: PHONE_FORMAT_HINT }),
  website: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

// React resets uncontrolled fields to their defaultValue once a form action
// finishes — including on a validation error. Echoing the just-submitted
// strings back in error state (used as defaultValue) is what makes that
// reset land on what the user typed instead of wiping the form.
export type PartnerCompanyFormValues = {
  name: string;
  industry: string;
  phone: string;
  website: string;
  address: string;
  notes: string;
};

function stringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function extractCompanyFormValues(formData: FormData): PartnerCompanyFormValues {
  return {
    name: stringField(formData, "name"),
    industry: stringField(formData, "industry"),
    phone: stringField(formData, "phone"),
    website: stringField(formData, "website"),
    address: stringField(formData, "address"),
    notes: stringField(formData, "notes"),
  };
}

export type PartnerCompanyFormState = { error: string; values: PartnerCompanyFormValues } | undefined;

type ParsedCompanyForm =
  | { success: false; error: string }
  | {
      success: true;
      data: {
        name: string;
        industry: Industry | null;
        phone: string | null;
        website: string | null;
        address: string | null;
        notes: string | null;
      };
    };

function parseCompanyForm(formData: FormData): ParsedCompanyForm {
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry"),
    phone: formData.get("phone"),
    website: formData.get("website"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid company data" };
  }
  const data = parsed.data;
  return {
    success: true,
    data: {
      name: data.name,
      industry: (data.industry || null) as Industry | null,
      phone: data.phone ? normalizePhone(data.phone) : null,
      website: data.website || null,
      address: data.address || null,
      notes: data.notes || null,
    },
  };
}

export async function createPartnerCompany(
  _prevState: PartnerCompanyFormState,
  formData: FormData,
): Promise<PartnerCompanyFormState> {
  const partner = await requirePartnerAction();
  const parsed = parseCompanyForm(formData);
  if (!parsed.success) return { error: parsed.error, values: extractCompanyFormValues(formData) };
  const company = await db.partnerCompany.create({ data: { ...parsed.data, partnerId: partner.id } });
  revalidatePath("/business-portal/companies");
  redirect(`/business-portal/companies/${company.id}`);
}

// `id` is checked against the calling partner before anything is written —
// a partner's own request could in principle name any company id, and only
// one they actually own may ever be touched here (same convention as
// getOwnedListing in src/lib/directory.ts).
export async function updatePartnerCompany(
  id: string,
  _prevState: PartnerCompanyFormState,
  formData: FormData,
): Promise<PartnerCompanyFormState> {
  const partner = await requirePartnerAction();
  const parsed = parseCompanyForm(formData);
  if (!parsed.success) return { error: parsed.error, values: extractCompanyFormValues(formData) };
  const existing = await db.partnerCompany.findFirst({ where: { id, partnerId: partner.id } });
  if (!existing) return { error: "Company not found.", values: extractCompanyFormValues(formData) };
  await db.partnerCompany.update({ where: { id }, data: parsed.data });
  revalidatePath("/business-portal/companies");
  revalidatePath(`/business-portal/companies/${id}`);
  redirect(`/business-portal/companies/${id}`);
}

export async function deletePartnerCompany(id: string, formData: FormData) {
  void formData;
  const partner = await requirePartnerAction();
  const existing = await db.partnerCompany.findFirst({ where: { id, partnerId: partner.id } });
  if (!existing) throw new Error("Company not found.");
  await db.partnerCompany.delete({ where: { id } });
  revalidatePath("/business-portal/companies");
  redirect("/business-portal/companies");
}
