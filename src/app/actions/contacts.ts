"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES, photoDataUrl } from "@/lib/photo";
import { isValidPhoneFormat, normalizePhone, PHONE_FORMAT_HINT } from "@/lib/phone";
import { toTitleCase } from "@/lib/names";
import { LIFECYCLE_STAGES } from "@/lib/labels";
import type { LifecycleStage } from "@/generated/prisma/client";

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || isValidPhoneFormat(value), { message: PHONE_FORMAT_HINT }),
  title: z.string().trim().optional(),
  companyId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  lifecycleStage: z.string().trim().optional(),
});

// Returns {} to leave photoUrl untouched, { photoUrl: null } to clear it, or
// { photoUrl: <data URL> } to set a new one — spread directly into the
// create/update data so "no change" doesn't require a separate code path.
async function parseContactPhoto(formData: FormData): Promise<{ photoUrl?: string | null }> {
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      throw new Error("Photo must be a JPEG, PNG, WebP, or GIF image.");
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new Error("Photo must be under 3MB.");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    return { photoUrl: photoDataUrl(buffer, file.type) };
  }
  if (formData.get("removePhoto") === "on") {
    return { photoUrl: null };
  }
  return {};
}

// React resets uncontrolled fields to their defaultValue once a form action
// finishes — including on a validation error. Echoing the just-submitted
// strings back in error state (used as defaultValue) is what makes that
// reset land on what the user typed instead of wiping the form.
export type ContactFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  companyId: string;
  notes: string;
  lifecycleStage: string;
};

function stringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function extractContactFormValues(formData: FormData): ContactFormValues {
  return {
    firstName: stringField(formData, "firstName"),
    lastName: stringField(formData, "lastName"),
    email: stringField(formData, "email"),
    phone: stringField(formData, "phone"),
    title: stringField(formData, "title"),
    companyId: stringField(formData, "companyId"),
    notes: stringField(formData, "notes"),
    lifecycleStage: stringField(formData, "lifecycleStage"),
  };
}

function parseContactForm(formData: FormData) {
  const parsed = contactSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    title: formData.get("title"),
    companyId: formData.get("companyId"),
    notes: formData.get("notes"),
    lifecycleStage: formData.get("lifecycleStage"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid contact data");
  }
  const data = parsed.data;
  return {
    firstName: toTitleCase(data.firstName),
    lastName: data.lastName ? toTitleCase(data.lastName) : null,
    email: data.email || null,
    phone: data.phone ? normalizePhone(data.phone) : null,
    title: data.title || null,
    companyId: data.companyId || null,
    notes: data.notes || null,
    lifecycleStage: (data.lifecycleStage || null) as LifecycleStage | null,
  };
}

export type ContactFormState = { error: string; values: ContactFormValues } | undefined;

export async function createContact(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  await requireAdminAction();
  let data: ReturnType<typeof parseContactForm>;
  let photo: Awaited<ReturnType<typeof parseContactPhoto>>;
  try {
    data = parseContactForm(formData);
    photo = await parseContactPhoto(formData);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong.",
      values: extractContactFormValues(formData),
    };
  }
  const contact = await db.contact.create({ data: { ...data, ...photo } });
  revalidatePath("/contacts");
  revalidatePath("/");
  if (data.companyId) revalidatePath(`/companies/${data.companyId}`);
  redirect(`/contacts/${contact.id}`);
}

export async function updateContact(
  id: string,
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  await requireAdminAction();
  let data: ReturnType<typeof parseContactForm>;
  let photo: Awaited<ReturnType<typeof parseContactPhoto>>;
  try {
    data = parseContactForm(formData);
    photo = await parseContactPhoto(formData);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong.",
      values: extractContactFormValues(formData),
    };
  }
  const previous = await db.contact.findUnique({
    where: { id },
    select: { companyId: true },
  });
  await db.contact.update({ where: { id }, data: { ...data, ...photo } });
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  if (previous?.companyId) revalidatePath(`/companies/${previous.companyId}`);
  if (data.companyId) revalidatePath(`/companies/${data.companyId}`);
  redirect(`/contacts/${id}`);
}

export async function changeContactLifecycleStage(
  id: string,
  stage: string,
): Promise<{ error: string } | undefined> {
  await requireAdminAction();
  const value = stage === "" ? null : (stage as LifecycleStage);
  if (value !== null && !LIFECYCLE_STAGES.includes(value)) {
    return { error: "Not a valid stage." };
  }
  await db.contact.update({ where: { id }, data: { lifecycleStage: value } });
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/");
}

export async function linkExistingContact(companyId: string, formData: FormData) {
  await requireAdminAction();
  const contactId = formData.get("contactId");
  if (typeof contactId !== "string" || !contactId) return;
  const previous = await db.contact.findUnique({
    where: { id: contactId },
    select: { companyId: true },
  });
  await db.contact.update({ where: { id: contactId }, data: { companyId } });
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/companies/${companyId}`);
  if (previous?.companyId) revalidatePath(`/companies/${previous.companyId}`);
}

export async function deleteContact(id: string, formData: FormData) {
  void formData;
  await requireAdminAction();
  const contact = await db.contact.delete({ where: { id } });
  revalidatePath("/contacts");
  revalidatePath("/deals");
  revalidatePath("/");
  if (contact.companyId) revalidatePath(`/companies/${contact.companyId}`);
  redirect("/contacts");
}
