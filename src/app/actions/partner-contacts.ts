"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePartnerAction } from "@/lib/auth/dal";
import { isValidEmailFormat } from "@/lib/email-format";
import { isValidPhoneFormat, normalizePhone, PHONE_FORMAT_HINT } from "@/lib/phone";

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || isValidEmailFormat(value), { message: "Enter a valid email address" }),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || isValidPhoneFormat(value), { message: PHONE_FORMAT_HINT }),
  title: z.string().trim().optional(),
  companyId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type PartnerContactFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  companyId: string;
  notes: string;
};

function stringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function extractContactFormValues(formData: FormData): PartnerContactFormValues {
  return {
    firstName: stringField(formData, "firstName"),
    lastName: stringField(formData, "lastName"),
    email: stringField(formData, "email"),
    phone: stringField(formData, "phone"),
    title: stringField(formData, "title"),
    companyId: stringField(formData, "companyId"),
    notes: stringField(formData, "notes"),
  };
}

export type PartnerContactFormState = { error: string; values: PartnerContactFormValues } | undefined;

type ParsedContactForm =
  | { success: false; error: string }
  | {
      success: true;
      data: {
        firstName: string;
        lastName: string | null;
        email: string | null;
        phone: string | null;
        title: string | null;
        companyId: string | null;
        notes: string | null;
      };
    };

// A companyId submitted with the form could in principle name any
// PartnerCompany id, not just one this partner owns — reconciled against a
// real, owned row rather than trusted as-is (same convention as
// saveListingFields reconciling categoryIds in src/app/actions/directory.ts).
async function parseContactForm(formData: FormData, partnerId: string): Promise<ParsedContactForm> {
  const parsed = contactSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    title: formData.get("title"),
    companyId: formData.get("companyId"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid contact data" };
  }
  const data = parsed.data;
  let companyId: string | null = null;
  if (data.companyId) {
    const company = await db.partnerCompany.findFirst({ where: { id: data.companyId, partnerId }, select: { id: true } });
    companyId = company?.id ?? null;
  }
  return {
    success: true,
    data: {
      firstName: data.firstName,
      lastName: data.lastName || null,
      email: data.email || null,
      phone: data.phone ? normalizePhone(data.phone) : null,
      title: data.title || null,
      companyId,
      notes: data.notes || null,
    },
  };
}

export async function createPartnerContact(
  _prevState: PartnerContactFormState,
  formData: FormData,
): Promise<PartnerContactFormState> {
  const partner = await requirePartnerAction();
  const parsed = await parseContactForm(formData, partner.id);
  if (!parsed.success) return { error: parsed.error, values: extractContactFormValues(formData) };
  const contact = await db.partnerContact.create({ data: { ...parsed.data, partnerId: partner.id } });
  revalidatePath("/business-portal/contacts");
  redirect(`/business-portal/contacts/${contact.id}`);
}

export async function updatePartnerContact(
  id: string,
  _prevState: PartnerContactFormState,
  formData: FormData,
): Promise<PartnerContactFormState> {
  const partner = await requirePartnerAction();
  const existing = await db.partnerContact.findFirst({ where: { id, partnerId: partner.id } });
  if (!existing) return { error: "Contact not found.", values: extractContactFormValues(formData) };
  const parsed = await parseContactForm(formData, partner.id);
  if (!parsed.success) return { error: parsed.error, values: extractContactFormValues(formData) };
  await db.partnerContact.update({ where: { id }, data: parsed.data });
  revalidatePath("/business-portal/contacts");
  revalidatePath(`/business-portal/contacts/${id}`);
  redirect(`/business-portal/contacts/${id}`);
}

export async function deletePartnerContact(id: string, formData: FormData) {
  void formData;
  const partner = await requirePartnerAction();
  const existing = await db.partnerContact.findFirst({ where: { id, partnerId: partner.id } });
  if (!existing) throw new Error("Contact not found.");
  await db.partnerContact.delete({ where: { id } });
  revalidatePath("/business-portal/contacts");
  redirect("/business-portal/contacts");
}
