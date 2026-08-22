"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import type { QuoteStatus } from "@/generated/prisma/client";
import { requireAdminAction } from "@/lib/auth/dal";

const quoteItemSchema = z.object({
  description: z.string().trim().min(1, "Each line item needs a description"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  unitPrice: z.coerce.number().min(0, "Price must be zero or more"),
  servicePackageId: z.string().trim().optional().nullable(),
});

const quoteSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  notes: z.string().trim().optional(),
  items: z.array(quoteItemSchema).min(1, "Add at least one line item"),
});

export type QuoteFormState = { error: string } | undefined;

function parseQuoteForm(formData: FormData) {
  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get("itemsJson") || "[]"));
  } catch {
    throw new Error("Line items could not be read — try again.");
  }

  const parsed = quoteSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes"),
    items: rawItems,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid quote data");
  }

  return {
    title: parsed.data.title,
    notes: parsed.data.notes || null,
    items: parsed.data.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      servicePackageId: item.servicePackageId || null,
    })),
  };
}

export async function createQuote(
  dealId: string,
  _prevState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  await requireAdminAction();
  let parsed;
  try {
    parsed = parseQuoteForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid quote data" };
  }

  const quote = await db.quote.create({
    data: {
      title: parsed.title,
      notes: parsed.notes,
      dealId,
      items: {
        create: parsed.items.map((item, index) => ({ ...item, sortOrder: index })),
      },
    },
  });

  revalidatePath(`/deals/${dealId}`);
  redirect(`/deals/${dealId}/quotes/${quote.id}`);
}

export async function updateQuote(
  quoteId: string,
  _prevState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  await requireAdminAction();
  let parsed;
  try {
    parsed = parseQuoteForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid quote data" };
  }

  const quote = await db.quote.update({
    where: { id: quoteId },
    data: {
      title: parsed.title,
      notes: parsed.notes,
      items: {
        deleteMany: {},
        create: parsed.items.map((item, index) => ({ ...item, sortOrder: index })),
      },
    },
  });

  revalidatePath(`/deals/${quote.dealId}`);
  revalidatePath(`/deals/${quote.dealId}/quotes/${quote.id}`);
  redirect(`/deals/${quote.dealId}/quotes/${quote.id}`);
}

export async function deleteQuote(quoteId: string) {
  await requireAdminAction();
  const quote = await db.quote.delete({ where: { id: quoteId }, select: { dealId: true } });
  revalidatePath(`/deals/${quote.dealId}`);
  redirect(`/deals/${quote.dealId}`);
}

export async function sendQuote(quoteId: string) {
  await requireAdminAction();
  const quote = await db.quote.findUniqueOrThrow({
    where: { id: quoteId },
    select: { dealId: true, status: true },
  });
  if (quote.status === "DRAFT") {
    await db.quote.update({ where: { id: quoteId }, data: { status: "SENT", sentAt: new Date() } });
  }
  revalidatePath(`/deals/${quote.dealId}`);
  revalidatePath(`/deals/${quote.dealId}/quotes/${quoteId}`);
}

// Called from the public quote page (no session) on first render — a real
// visitor, not a logged-in user, so this deliberately skips any auth check.
export async function recordQuoteView(quoteId: string) {
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    select: { status: true, firstViewedAt: true },
  });
  if (!quote) return;

  const now = new Date();
  const nextStatus: QuoteStatus =
    quote.status === "DRAFT" || quote.status === "SENT" ? "VIEWED" : quote.status;

  await db.quote.update({
    where: { id: quoteId },
    data: {
      status: nextStatus,
      firstViewedAt: quote.firstViewedAt ?? now,
      lastViewedAt: now,
      viewCount: { increment: 1 },
    },
  });
}

// Also called from the public quote page — the client accepting or
// declining, not a logged-in user.
export async function respondToQuote(quoteId: string, decision: "ACCEPTED" | "DECLINED") {
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    select: { title: true, dealId: true, status: true },
  });
  if (!quote || quote.status === "ACCEPTED" || quote.status === "DECLINED") return;

  await db.quote.update({
    where: { id: quoteId },
    data: { status: decision, respondedAt: new Date() },
  });

  await db.activity.create({
    data: {
      type: "NOTE",
      content: `Quote "${quote.title}" was ${decision === "ACCEPTED" ? "accepted" : "declined"} by the client.`,
      dealId: quote.dealId,
    },
  });
}
