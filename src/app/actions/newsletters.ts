"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { withFlash } from "@/lib/utils";
import { getBookingSettings } from "@/lib/settings";
import { getNewsletterSender } from "@/lib/newsletter-sender";
import { materializeNewsletterRecipients } from "@/lib/newsletters";

export type NewsletterFormState = { error: string } | undefined;

const composeSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required"),
  bodyMarkdown: z.string().trim().min(1, "Write something before saving"),
  listId: z.string().trim().min(1, "Choose an audience"),
});

function parseCompose(formData: FormData) {
  return composeSchema.safeParse({
    subject: formData.get("subject"),
    bodyMarkdown: formData.get("bodyMarkdown"),
    listId: formData.get("listId"),
  });
}

export async function createNewsletter(
  _prevState: NewsletterFormState,
  formData: FormData,
): Promise<NewsletterFormState> {
  const user = await requireAdminAction();
  const parsed = parseCompose(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid newsletter" };
  }

  const newsletter = await db.newsletter.create({
    data: { ...parsed.data, createdById: user.id },
  });

  revalidatePath("/newsletters");
  redirect(withFlash(`/newsletters/${newsletter.id}`, "Draft created."));
}

export async function updateNewsletter(
  id: string,
  _prevState: NewsletterFormState,
  formData: FormData,
): Promise<NewsletterFormState> {
  await requireAdminAction();
  const parsed = parseCompose(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid newsletter" };
  }

  // Scoped to status: DRAFT rather than a plain where:{id} update — a
  // newsletter that's already been scheduled has materialized recipients
  // and possibly started sending; editing its content out from under that
  // would be surprising, so the compose form isn't even shown once it's
  // past DRAFT (see the [id] page), but this guards the action itself too.
  const result = await db.newsletter.updateMany({ where: { id, status: "DRAFT" }, data: parsed.data });
  if (result.count === 0) {
    return { error: "This newsletter can no longer be edited." };
  }

  revalidatePath(`/newsletters/${id}`);
  revalidatePath("/newsletters");
  redirect(withFlash(`/newsletters/${id}`, "Changes saved."));
}

export async function deleteNewsletter(id: string, formData: FormData) {
  void formData;
  await requireAdminAction();
  await db.newsletter.deleteMany({ where: { id, status: "DRAFT" } });
  revalidatePath("/newsletters");
  redirect(withFlash("/newsletters", "Draft deleted."));
}

// Shared by scheduleNewsletter (a future date/time the admin picked) and
// sendNewsletterNow (scheduledAt = right now) — materializing recipients
// and flipping to SCHEDULED is identical either way; the cron script
// (scripts/send-newsletters.ts) doesn't distinguish "due immediately" from
// "due because time has passed" at all.
async function scheduleAt(id: string, scheduledAt: Date): Promise<NewsletterFormState> {
  const sender = await getNewsletterSender();
  if (!sender) {
    return { error: "Set up a sending mailbox in Settings → Newsletter before scheduling a send." };
  }

  const newsletter = await db.newsletter.findUnique({ where: { id } });
  if (!newsletter || newsletter.status !== "DRAFT") {
    return { error: "This newsletter can't be scheduled right now." };
  }
  if (!newsletter.listId) {
    return { error: "Choose an audience before scheduling." };
  }

  const list = await db.contactList.findUnique({
    where: { id: newsletter.listId },
    select: { id: true, type: true, filterDefinition: true },
  });
  if (!list) {
    return { error: "That audience list no longer exists — choose another." };
  }

  const count = await materializeNewsletterRecipients(id, list);
  if (count === 0) {
    return { error: "No eligible recipients in that list — everyone either has no email on file or has unsubscribed." };
  }

  await db.newsletter.update({ where: { id }, data: { status: "SCHEDULED", scheduledAt } });
  revalidatePath(`/newsletters/${id}`);
  revalidatePath("/newsletters");
  redirect(withFlash(`/newsletters/${id}`, "Newsletter scheduled."));
}

const scheduleSchema = z.object({
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
});

export async function scheduleNewsletter(
  id: string,
  _prevState: NewsletterFormState,
  formData: FormData,
): Promise<NewsletterFormState> {
  await requireAdminAction();
  const parsed = scheduleSchema.safeParse({
    scheduledDate: formData.get("scheduledDate"),
    scheduledTime: formData.get("scheduledTime"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Pick a date and time" };
  }

  const [year, month, day] = parsed.data.scheduledDate.split("-").map(Number);
  const [hour, minute] = parsed.data.scheduledTime.split(":").map(Number);
  // Same fixed-UTC-offset conversion booking slots use (src/lib/booking.ts)
  // — reusing the org's one configured offset rather than adding a second
  // "what timezone did you mean" setting for this one other feature.
  const { utcOffsetMinutes } = await getBookingSettings();
  const scheduledAt = new Date(Date.UTC(year, month - 1, day, hour, minute) - utcOffsetMinutes * 60_000);
  if (scheduledAt.getTime() < Date.now() - 60_000) {
    return { error: "Pick a time in the future." };
  }

  return scheduleAt(id, scheduledAt);
}

export async function sendNewsletterNow(
  id: string,
  _prevState: NewsletterFormState,
  formData: FormData,
): Promise<NewsletterFormState> {
  void formData;
  await requireAdminAction();
  return scheduleAt(id, new Date());
}

export async function cancelNewsletterSchedule(id: string, formData: FormData) {
  void formData;
  await requireAdminAction();
  const newsletter = await db.newsletter.findUnique({ where: { id }, select: { status: true } });
  if (newsletter?.status === "SCHEDULED") {
    // Recipients get re-materialized fresh on the next schedule/send —
    // dropping them now means a re-schedule reflects current list
    // membership and opt-outs rather than a stale snapshot.
    await db.$transaction([
      db.newsletterRecipient.deleteMany({ where: { newsletterId: id } }),
      db.newsletter.update({ where: { id }, data: { status: "DRAFT", scheduledAt: null } }),
    ]);
  }
  revalidatePath(`/newsletters/${id}`);
  revalidatePath("/newsletters");
  redirect(withFlash(`/newsletters/${id}`, "Schedule canceled — back to draft."));
}
