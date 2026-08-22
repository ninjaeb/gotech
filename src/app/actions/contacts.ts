"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  title: z.string().trim().optional(),
  companyId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

// Server Actions cap the whole request body at 5mb (next.config.ts) and
// base64 inflates size by ~4/3, so 3mb raw (~4mb encoded) leaves headroom
// for the rest of the form. Comfortably covers a typical phone photo.
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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
    return { photoUrl: `data:${file.type};base64,${buffer.toString("base64")}` };
  }
  if (formData.get("removePhoto") === "on") {
    return { photoUrl: null };
  }
  return {};
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
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid contact data");
  }
  const data = parsed.data;
  return {
    firstName: data.firstName,
    lastName: data.lastName || null,
    email: data.email || null,
    phone: data.phone || null,
    title: data.title || null,
    companyId: data.companyId || null,
    notes: data.notes || null,
  };
}

export type ContactFormState = { error: string } | undefined;

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
    return { error: error instanceof Error ? error.message : "Something went wrong." };
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
    return { error: error instanceof Error ? error.message : "Something went wrong." };
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
