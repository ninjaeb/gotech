"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { withFlash } from "@/lib/utils";

const templateItemSchema = z.object({
  description: z.string().trim().min(1, "Each line item needs a description"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  unitPrice: z.coerce.number().min(0, "Price must be zero or more"),
  servicePackageId: z.string().trim().optional().nullable(),
});

// Same shape as quotes.ts's quoteSchema — the field names ("title",
// "notes", "itemsJson") match on purpose, so QuoteForm can be reused
// unmodified for both a Quote and a QuoteTemplate (see quote-form.tsx).
const templateSchema = z.object({
  title: z.string().trim().min(1, "Name is required"),
  notes: z.string().trim().optional(),
  items: z.array(templateItemSchema).min(1, "Add at least one line item"),
});

export type QuoteTemplateFormState = { error: string } | undefined;

function parseTemplateForm(formData: FormData) {
  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get("itemsJson") || "[]"));
  } catch {
    throw new Error("Line items could not be read — try again.");
  }

  const parsed = templateSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes"),
    items: rawItems,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid template data");
  }

  return {
    name: parsed.data.title,
    notes: parsed.data.notes || null,
    items: parsed.data.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      servicePackageId: item.servicePackageId || null,
    })),
  };
}

export async function createQuoteTemplate(
  _prevState: QuoteTemplateFormState,
  formData: FormData,
): Promise<QuoteTemplateFormState> {
  await requireAdminAction();
  let parsed: ReturnType<typeof parseTemplateForm>;
  try {
    parsed = parseTemplateForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid template data" };
  }

  const template = await db.quoteTemplate.create({
    data: {
      name: parsed.name,
      notes: parsed.notes,
      items: { create: parsed.items.map((item, index) => ({ ...item, sortOrder: index })) },
    },
  });

  revalidatePath("/settings/quote-templates");
  redirect(withFlash(`/settings/quote-templates/${template.id}`, "Quote template created."));
}

export async function updateQuoteTemplate(
  templateId: string,
  _prevState: QuoteTemplateFormState,
  formData: FormData,
): Promise<QuoteTemplateFormState> {
  await requireAdminAction();
  let parsed: ReturnType<typeof parseTemplateForm>;
  try {
    parsed = parseTemplateForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid template data" };
  }

  await db.quoteTemplate.update({
    where: { id: templateId },
    data: {
      name: parsed.name,
      notes: parsed.notes,
      items: {
        deleteMany: {},
        create: parsed.items.map((item, index) => ({ ...item, sortOrder: index })),
      },
    },
  });

  revalidatePath("/settings/quote-templates");
  revalidatePath(`/settings/quote-templates/${templateId}`);
  redirect(withFlash(`/settings/quote-templates/${templateId}`, "Changes saved."));
}

export async function deleteQuoteTemplate(id: string) {
  await requireAdminAction();
  await db.quoteTemplate.delete({ where: { id } });
  revalidatePath("/settings/quote-templates");
  redirect(withFlash("/settings/quote-templates", "Quote template deleted."));
}
