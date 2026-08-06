"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";

const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  domain: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

function parseCompanyForm(formData: FormData) {
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    domain: formData.get("domain"),
    industry: formData.get("industry"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid company data");
  }
  const data = parsed.data;
  return {
    name: data.name,
    domain: data.domain || null,
    industry: data.industry || null,
    phone: data.phone || null,
    address: data.address || null,
    notes: data.notes || null,
  };
}

export async function createCompany(formData: FormData) {
  const data = parseCompanyForm(formData);
  const company = await db.company.create({ data });
  revalidatePath("/companies");
  revalidatePath("/");
  redirect(`/companies/${company.id}`);
}

export async function updateCompany(id: string, formData: FormData) {
  const data = parseCompanyForm(formData);
  await db.company.update({ where: { id }, data });
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  redirect(`/companies/${id}`);
}

export async function deleteCompany(id: string, formData: FormData) {
  void formData;
  await db.company.delete({ where: { id } });
  revalidatePath("/companies");
  revalidatePath("/deals");
  revalidatePath("/");
  redirect("/companies");
}
