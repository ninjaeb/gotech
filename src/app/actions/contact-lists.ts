"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { isDynamicListTemplateKey } from "@/lib/contact-lists";

const createListSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(["STATIC", "DYNAMIC"]),
  // Only rendered in the DOM at all for a DYNAMIC list — formData.get()
  // returns null (not undefined) for a field that's absent entirely, which
  // plain .optional() doesn't accept.
  templateKey: z.string().trim().nullable().optional(),
});

export type ListFormState = { error: string } | undefined;

export async function createList(_prevState: ListFormState, formData: FormData): Promise<ListFormState> {
  const user = await requireAdminAction();
  const parsed = createListSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    templateKey: formData.get("templateKey"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid list data" };
  }
  const { name, type, templateKey } = parsed.data;

  let filterDefinition: { template: string } | undefined;
  if (type === "DYNAMIC") {
    if (!isDynamicListTemplateKey(templateKey)) {
      return { error: "Pick a valid template for a dynamic list." };
    }
    filterDefinition = { template: templateKey };
  }

  const list = await db.contactList.create({
    data: { name, type, ownerId: user.id, filterDefinition },
  });
  revalidatePath("/lists");
  redirect(`/lists/${list.id}`);
}

export async function deleteList(id: string, formData: FormData) {
  void formData;
  await requireAdminAction();
  await db.contactList.delete({ where: { id } });
  revalidatePath("/lists");
  redirect("/lists");
}

export async function addContactToList(listId: string, formData: FormData) {
  await requireAdminAction();
  const contactId = String(formData.get("contactId") || "").trim();
  if (!contactId) return;

  const list = await db.contactList.findUniqueOrThrow({ where: { id: listId } });
  if (list.type !== "STATIC") {
    throw new Error("Contacts can only be added directly to a static list — a dynamic list's members are computed automatically.");
  }

  await db.contactListMember.upsert({
    where: { listId_contactId: { listId, contactId } },
    create: { listId, contactId },
    update: {},
  });
  revalidatePath(`/lists/${listId}`);
}

export async function removeContactFromList(listId: string, formData: FormData) {
  await requireAdminAction();
  const contactId = String(formData.get("contactId") || "").trim();
  if (!contactId) return;

  await db.contactListMember.deleteMany({ where: { listId, contactId } });
  revalidatePath(`/lists/${listId}`);
}
