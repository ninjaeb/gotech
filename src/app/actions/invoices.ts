"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { InvoiceStatus } from "@/generated/prisma/client";

const invoiceSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  amount: z.coerce.number().min(0, "Amount must be zero or more"),
  status: z.nativeEnum(InvoiceStatus).default(InvoiceStatus.DRAFT),
  dueDate: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type InvoiceFormState = { error: string } | undefined;

function parseInvoiceForm(formData: FormData) {
  const parsed = invoiceSchema.safeParse({
    title: formData.get("title"),
    amount: formData.get("amount"),
    status: formData.get("status") || InvoiceStatus.DRAFT,
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid invoice data");
  }
  return parsed.data;
}

// DRAFT clears sentAt; any other status sets it (once — see below). Only
// PAID_IN_FULL carries a paidAt; moving off it clears the timestamp rather
// than leaving a stale one behind if a status change is corrected.
function statusTimestamps(status: InvoiceStatus, previousSentAt: Date | null) {
  return {
    sentAt: status === "DRAFT" ? null : (previousSentAt ?? new Date()),
    paidAt: status === "PAID_IN_FULL" ? new Date() : null,
  };
}

export async function createInvoice(
  projectId: string,
  _prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  let data;
  try {
    data = parseInvoiceForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid invoice data" };
  }

  await db.invoice.create({
    data: {
      projectId,
      title: data.title,
      amount: data.amount,
      status: data.status,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes || null,
      ...statusTimestamps(data.status, null),
    },
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function updateInvoice(
  invoiceId: string,
  _prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  let data;
  try {
    data = parseInvoiceForm(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid invoice data" };
  }

  const previous = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: { sentAt: true },
  });

  const invoice = await db.invoice.update({
    where: { id: invoiceId },
    data: {
      title: data.title,
      amount: data.amount,
      status: data.status,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes || null,
      ...statusTimestamps(data.status, previous.sentAt),
    },
  });

  revalidatePath(`/projects/${invoice.projectId}`);
  redirect(`/projects/${invoice.projectId}`);
}

export async function changeInvoiceStatus(id: string, status: InvoiceStatus) {
  const previous = await db.invoice.findUniqueOrThrow({ where: { id }, select: { sentAt: true } });
  const invoice = await db.invoice.update({
    where: { id },
    data: { status, ...statusTimestamps(status, previous.sentAt) },
  });
  revalidatePath(`/projects/${invoice.projectId}`);
}

export async function deleteInvoice(id: string, formData: FormData) {
  void formData;
  const invoice = await db.invoice.delete({ where: { id } });
  revalidatePath(`/projects/${invoice.projectId}`);
}
