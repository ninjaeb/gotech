"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  title: z.string().trim().optional(),
  companyId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

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

export async function createContact(formData: FormData) {
  const data = parseContactForm(formData);
  const contact = await db.contact.create({ data });
  revalidatePath("/contacts");
  revalidatePath("/");
  if (data.companyId) revalidatePath(`/companies/${data.companyId}`);
  redirect(`/contacts/${contact.id}`);
}

export async function updateContact(id: string, formData: FormData) {
  const data = parseContactForm(formData);
  const previous = await db.contact.findUnique({
    where: { id },
    select: { companyId: true },
  });
  await db.contact.update({ where: { id }, data });
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  if (previous?.companyId) revalidatePath(`/companies/${previous.companyId}`);
  if (data.companyId) revalidatePath(`/companies/${data.companyId}`);
  redirect(`/contacts/${id}`);
}

export async function deleteContact(id: string, formData: FormData) {
  void formData;
  const contact = await db.contact.delete({ where: { id } });
  revalidatePath("/contacts");
  revalidatePath("/deals");
  revalidatePath("/");
  if (contact.companyId) revalidatePath(`/companies/${contact.companyId}`);
  redirect("/contacts");
}
