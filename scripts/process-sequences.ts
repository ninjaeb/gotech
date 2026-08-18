import "dotenv/config";
import { db } from "../src/lib/db";
import { sendEmailViaAccount, findUnambiguousOpenDeal } from "../src/lib/email";
import { nextDueDate } from "../src/lib/sequences";

// Run on a schedule (cPanel Cron Job — see README) to send due sequence
// steps. A send failure (SMTP/network) leaves the enrollment ACTIVE with its
// nextStepDueAt unchanged, so the next run just retries the same step —
// only genuinely unrecoverable states (no email on file, a step removed
// out from under an active enrollment, no connected mailbox) are marked
// FAILED and left for a human to fix.
async function main() {
  const due = await db.sequenceEnrollment.findMany({
    where: { status: "ACTIVE", nextStepDueAt: { lte: new Date() } },
    include: {
      currentStep: true,
      sequence: { include: { steps: { orderBy: { sortOrder: "asc" } } } },
      contact: { select: { email: true, lastInboundEmailAt: true } },
      user: { select: { email: true, emailAccount: true } },
    },
  });

  if (due.length === 0) {
    console.log("No sequence steps due.");
    return;
  }

  for (const enrollment of due) {
    const email = enrollment.contact.email;
    try {
      if (enrollment.contact.lastInboundEmailAt && enrollment.contact.lastInboundEmailAt > enrollment.enrolledAt) {
        await db.sequenceEnrollment.update({ where: { id: enrollment.id }, data: { status: "STOPPED_REPLY" } });
        console.log(`${email ?? enrollment.contactId}: stopped — replied.`);
        continue;
      }
      if (!email) {
        await db.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "FAILED", lastError: "Contact has no email address." },
        });
        continue;
      }
      if (!enrollment.currentStep) {
        await db.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "FAILED", lastError: "A step in this sequence was removed." },
        });
        continue;
      }
      const account = enrollment.user.emailAccount;
      if (!account) {
        await db.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "FAILED", lastError: `${enrollment.user.email} no longer has a connected mailbox.` },
        });
        continue;
      }

      await sendEmailViaAccount(account, {
        to: email,
        subject: enrollment.currentStep.subject,
        text: enrollment.currentStep.body,
      });

      const dealId = await findUnambiguousOpenDeal(enrollment.contactId);
      await db.activity.create({
        data: {
          type: "EMAIL",
          content: `Sequence email — "${enrollment.currentStep.subject}": ${enrollment.currentStep.body}`,
          contactId: enrollment.contactId,
          dealId,
        },
      });

      const steps = enrollment.sequence.steps;
      const currentIndex = steps.findIndex((step) => step.id === enrollment.currentStep!.id);
      const nextStep = currentIndex >= 0 ? steps[currentIndex + 1] : undefined;

      await db.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: nextStep
          ? {
              currentStepId: nextStep.id,
              nextStepDueAt: nextDueDate(new Date(), nextStep.delayDays),
              lastStepSentAt: new Date(),
              lastError: null,
            }
          : { status: "COMPLETED", currentStepId: null, lastStepSentAt: new Date(), lastError: null },
      });
      console.log(`${email}: sent "${enrollment.currentStep.subject}".`);
    } catch (error) {
      console.error(`${email ?? enrollment.contactId}: send failed —`, error instanceof Error ? error.message : error);
      await db.sequenceEnrollment
        .update({
          where: { id: enrollment.id },
          data: { lastError: error instanceof Error ? error.message : "Send failed" },
        })
        .catch(() => {});
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
