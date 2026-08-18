"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { splitFullName } from "@/lib/format";

const leadSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  message: z.string().trim().optional(),
});

export type LeadFormState = { status: "error"; message: string } | { status: "success" } | undefined;

// Public, unauthenticated — submitted from the marketing-site embed, not a
// logged-in user. `website` is a honeypot: real visitors never see or fill
// it, so anything in it means a bot filled every field it could find. We
// still return "success" for those so the bot doesn't learn to retry.
export async function submitLead(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  if (String(formData.get("website") || "").trim()) {
    return { status: "success" };
  }

  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    companyName: formData.get("companyName"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid submission" };
  }
  const data = parsed.data;
  const { firstName, lastName } = splitFullName(data.name);

  let companyId: string | null = null;
  const companyName = data.companyName?.trim();
  if (companyName) {
    const company = await db.company.findFirst({ where: { name: companyName }, select: { id: true } });
    companyId = company?.id ?? (await db.company.create({ data: { name: companyName }, select: { id: true } })).id;
  }

  const existingContact = await db.contact.findFirst({
    where: { email: data.email },
    select: { id: true, companyId: true },
  });

  const contact = existingContact
    ? await db.contact.update({
        where: { id: existingContact.id },
        // Only fill in a company if the contact doesn't already have one —
        // an inbound form submission shouldn't override a CRM record a rep
        // has already curated.
        data: existingContact.companyId ? {} : { companyId },
        select: { id: true, companyId: true },
      })
    : await db.contact.create({
        data: {
          firstName: firstName || data.name,
          lastName: lastName || null,
          email: data.email,
          phone: data.phone || null,
          companyId,
        },
        select: { id: true, companyId: true },
      });

  const deal = await db.deal.create({
    data: {
      title: `${companyName || data.name} — Website inquiry`,
      companyId: contact.companyId ?? companyId,
      contactId: contact.id,
    },
  });

  if (data.message) {
    await db.activity.create({
      data: {
        type: "NOTE",
        content: `Website inquiry from ${data.name} (${data.email}): "${data.message}"`,
        dealId: deal.id,
      },
    });
  }

  revalidatePath("/deals");
  revalidatePath("/contacts");
  revalidatePath("/companies");
  revalidatePath("/");

  return { status: "success" };
}
