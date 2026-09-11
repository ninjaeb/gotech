"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { firstIssueMessage, lineItemSchema, parseItemsJson } from "@/lib/documents/schemas";
import { normalizeMoney } from "@/lib/documents/money";
import { withFlash } from "@/lib/utils";

// Same field names as a quote ("title", "notes", "itemsJson") on purpose, so
// LineItemsForm (mode "template") is reused unmodified.
const templateSchema = z.object({
  title: z.string().trim().min(1, "Name is required").max(191),
  notes: z.string().trim().max(10000).optional(),
  items: z.array(lineItemSchema).min(1, "Add at least one line item"),
});

export type QuoteTemplateFormState = { error: string } | undefined;

function parseTemplateForm(formData: FormData) {
  const parsed = templateSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes"),
    items: parseItemsJson(formData),
  });
  if (!parsed.success) throw new Error(firstIssueMessage(parsed.error, "Invalid template data"));

  return {
    name: parsed.data.title,
    notes: parsed.data.notes || null,
    items: parsed.data.items.map((item, index) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: normalizeMoney(item.unitPrice),
      unit: item.unit || null,
      taxable: item.taxable,
      servicePackageId: item.servicePackageId || null,
      sortOrder: index,
    })),
  };
}

export async function createQuoteTemplate(_prevState: QuoteTemplateFormState, formData: FormData): Promise<QuoteTemplateFormState> {
  await requireAdminAction();
  let parsed: ReturnType<typeof parseTemplateForm>;
  try {
    parsed = parseTemplateForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid template data" };
  }

  const template = await db.quoteTemplate.create({
    data: { name: parsed.name, notes: parsed.notes, items: { create: parsed.items } },
  });

  revalidatePath("/system/settings/quote-templates");
  redirect(withFlash(`/system/settings/quote-templates/${template.id}`, "Quote template created."));
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
    data: { name: parsed.name, notes: parsed.notes, items: { deleteMany: {}, create: parsed.items } },
  });

  revalidatePath("/system/settings/quote-templates");
  revalidatePath(`/system/settings/quote-templates/${templateId}`);
  redirect(withFlash(`/system/settings/quote-templates/${templateId}`, "Changes saved."));
}

export async function deleteQuoteTemplate(id: string) {
  await requireAdminAction();
  await db.quoteTemplate.delete({ where: { id } });
  revalidatePath("/system/settings/quote-templates");
  redirect(withFlash("/system/settings/quote-templates", "Quote template deleted."));
}
