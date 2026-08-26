"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { nextDueDate } from "@/lib/sequences";
import { getListContacts } from "@/lib/contact-list-query";

// Core upsert shared by the single-contact action below (which throws on
// any failure) and bulkEnrollListInSequence (which catches per-contact and
// tallies skips instead of aborting the whole batch — see that function).
async function upsertEnrollment({
  sequenceId,
  contactId,
  contactEmail,
  userId,
  firstStep,
}: {
  sequenceId: string;
  contactId: string;
  contactEmail: string | null;
  userId: string;
  firstStep: { id: string; delayDays: number };
}) {
  if (!contactEmail) {
    throw new Error("This contact needs an email address before enrolling them in a sequence.");
  }
  const existing = await db.sequenceEnrollment.findUnique({
    where: { sequenceId_contactId: { sequenceId, contactId } },
  });
  if (existing && existing.status === "ACTIVE") {
    throw new Error("This contact is already enrolled in that sequence.");
  }

  const enrolledAt = new Date();
  const nextStepDueAt = nextDueDate(enrolledAt, firstStep.delayDays);

  if (existing) {
    // Re-enrolling after it finished, was stopped, or failed — start over
    // rather than creating a second row (sequenceId+contactId is unique).
    await db.sequenceEnrollment.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        enrolledAt,
        nextStepDueAt,
        lastStepSentAt: null,
        lastError: null,
        currentStepId: firstStep.id,
        userId,
      },
    });
  } else {
    await db.sequenceEnrollment.create({
      data: { sequenceId, contactId, userId, currentStepId: firstStep.id, enrolledAt, nextStepDueAt },
    });
  }
}

export async function enrollContact(contactId: string, formData: FormData) {
  const sequenceId = String(formData.get("sequenceId") || "").trim();
  if (!sequenceId) throw new Error("Pick a sequence");

  const [user, contact, sequence] = await Promise.all([
    requireAdminAction(),
    db.contact.findUniqueOrThrow({ where: { id: contactId }, select: { email: true } }),
    db.sequence.findUniqueOrThrow({
      where: { id: sequenceId },
      include: { steps: { orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
  ]);
  const firstStep = sequence.steps[0];
  if (!firstStep) {
    throw new Error("This sequence has no steps yet.");
  }

  const emailAccount = await db.emailAccount.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!emailAccount) {
    throw new Error("Connect your email in Settings before enrolling a contact.");
  }

  await upsertEnrollment({ sequenceId, contactId, contactEmail: contact.email, userId: user.id, firstStep });
  revalidatePath(`/contacts/${contactId}`);
}

export type BulkEnrollState =
  | { status: "error"; message: string }
  | { status: "done"; enrolled: number; skipped: number }
  | undefined;

// Batch-tolerant: a contact with no email, or already actively enrolled,
// is skipped and counted rather than aborting the rest of the list.
export async function bulkEnrollListInSequence(
  listId: string,
  _prevState: BulkEnrollState,
  formData: FormData,
): Promise<BulkEnrollState> {
  const sequenceId = String(formData.get("sequenceId") || "").trim();
  if (!sequenceId) return { status: "error", message: "Pick a sequence." };

  const user = await requireAdminAction();
  const list = await db.contactList.findUnique({ where: { id: listId } });
  if (!list) return { status: "error", message: "List not found." };

  const sequence = await db.sequence.findUnique({
    where: { id: sequenceId },
    include: { steps: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  if (!sequence) return { status: "error", message: "Sequence not found." };
  const firstStep = sequence.steps[0];
  if (!firstStep) return { status: "error", message: "This sequence has no steps yet." };

  const emailAccount = await db.emailAccount.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!emailAccount) {
    return { status: "error", message: "Connect your email in Settings before enrolling contacts." };
  }

  const contacts = await getListContacts(list);
  let enrolled = 0;
  let skipped = 0;
  for (const contact of contacts) {
    try {
      await upsertEnrollment({ sequenceId, contactId: contact.id, contactEmail: contact.email, userId: user.id, firstStep });
      enrolled += 1;
    } catch {
      skipped += 1;
    }
  }

  revalidatePath(`/lists/${listId}`);
  return { status: "done", enrolled, skipped };
}

export async function stopEnrollment(id: string, formData: FormData) {
  void formData;
  await requireAdminAction();
  const enrollment = await db.sequenceEnrollment.update({
    where: { id },
    data: { status: "STOPPED_MANUAL" },
    select: { contactId: true },
  });
  revalidatePath(`/contacts/${enrollment.contactId}`);
}
