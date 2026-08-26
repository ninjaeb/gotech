"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { isValidPhoneFormat, normalizePhone, PHONE_FORMAT_HINT } from "@/lib/phone";
import type { Industry } from "@/generated/prisma/client";

const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  domain: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || isValidPhoneFormat(value), { message: PHONE_FORMAT_HINT }),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

// React resets uncontrolled fields to their defaultValue once a form action
// finishes — including on a validation error. Echoing the just-submitted
// strings back in error state (used as defaultValue) is what makes that
// reset land on what the user typed instead of wiping the form.
export type CompanyFormValues = {
  name: string;
  domain: string;
  industry: string;
  phone: string;
  address: string;
  notes: string;
};

function stringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function extractCompanyFormValues(formData: FormData): CompanyFormValues {
  return {
    name: stringField(formData, "name"),
    domain: stringField(formData, "domain"),
    industry: stringField(formData, "industry"),
    phone: stringField(formData, "phone"),
    address: stringField(formData, "address"),
    notes: stringField(formData, "notes"),
  };
}

export type CompanyFormState = { error: string; values: CompanyFormValues } | undefined;

type ParsedCompanyForm =
  | { success: false; error: string }
  | {
      success: true;
      data: {
        name: string;
        domain: string | null;
        industry: Industry | null;
        phone: string | null;
        address: string | null;
        notes: string | null;
      };
    };

function parseCompanyForm(formData: FormData): ParsedCompanyForm {
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    domain: formData.get("domain"),
    industry: formData.get("industry"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid company data",
    };
  }
  const data = parsed.data;
  return {
    success: true,
    data: {
      name: data.name,
      domain: data.domain || null,
      industry: (data.industry || null) as Industry | null,
      phone: data.phone ? normalizePhone(data.phone) : null,
      address: data.address || null,
      notes: data.notes || null,
    },
  };
}

export async function createCompany(_prevState: CompanyFormState, formData: FormData): Promise<CompanyFormState> {
  await requireAdminAction();
  const parsed = parseCompanyForm(formData);
  if (!parsed.success) return { error: parsed.error, values: extractCompanyFormValues(formData) };
  const company = await db.company.create({ data: parsed.data });
  revalidatePath("/companies");
  revalidatePath("/");
  redirect(`/companies/${company.id}`);
}

export async function updateCompany(
  id: string,
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  await requireAdminAction();
  const parsed = parseCompanyForm(formData);
  if (!parsed.success) return { error: parsed.error, values: extractCompanyFormValues(formData) };
  await db.company.update({ where: { id }, data: parsed.data });
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  redirect(`/companies/${id}`);
}

export async function deleteCompany(id: string, formData: FormData) {
  void formData;
  await requireAdminAction();
  await db.company.delete({ where: { id } });
  revalidatePath("/companies");
  revalidatePath("/deals");
  revalidatePath("/");
  redirect("/companies");
}
