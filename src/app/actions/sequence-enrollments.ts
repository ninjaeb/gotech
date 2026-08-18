"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { nextDueDate } from "@/lib/sequences";

export async function enrollContact(contactId: string, formData: FormData) {
  const sequenceId = String(formData.get("sequenceId") || "").trim();
  if (!sequenceId) throw new Error("Pick a sequence");

  const [user, contact, sequence] = await Promise.all([
    getCurrentUser(),
    db.contact.findUniqueOrThrow({ where: { id: contactId }, select: { email: true } }),
    db.sequence.findUniqueOrThrow({
      where: { id: sequenceId },
      include: { steps: { orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
  ]);
  if (!contact.email) {
    throw new Error("This contact needs an email address before enrolling them in a sequence.");
  }
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
        userId: user.id,
      },
    });
  } else {
    await db.sequenceEnrollment.create({
      data: { sequenceId, contactId, userId: user.id, currentStepId: firstStep.id, enrolledAt, nextStepDueAt },
    });
  }

  revalidatePath(`/contacts/${contactId}`);
}

export async function stopEnrollment(id: string, formData: FormData) {
  void formData;
  const enrollment = await db.sequenceEnrollment.update({
    where: { id },
    data: { status: "STOPPED_MANUAL" },
    select: { contactId: true },
  });
  revalidatePath(`/contacts/${enrollment.contactId}`);
}
