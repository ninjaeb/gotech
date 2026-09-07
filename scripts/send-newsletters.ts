import "dotenv/config";
import { db } from "../src/lib/db";
import { getConfiguredSiteOrigin } from "../src/lib/site-url";
import { getNewsletterSender, sendNewsletterEmail } from "../src/lib/newsletter-sender";
import { renderNewsletterBodyHtml, wrapNewsletterHtml } from "../src/lib/newsletter-render";

// Run on a schedule (cPanel Cron Job — see README), same pattern as
// process-sequences.ts. Two differences from that script, both because a
// Newsletter is a broadcast to a pre-materialized recipient list rather
// than N independently-scheduled per-contact rows:
//   - a newsletter's own due-check (SCHEDULED -> SENDING) happens once per
//     newsletter, separate from working through its recipients
//   - recipients are processed in small paced batches across possibly many
//     cron ticks, rather than one per enrollment per tick, so a large
//     audience can't blow through the sending mailbox's rate limits or tie
//     up a single script run for minutes
const BATCH_SIZE = 40;
const DELAY_BETWEEN_SENDS_MS = 750;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const siteOrigin = getConfiguredSiteOrigin();
  if (!siteOrigin) {
    // Every send needs a working unsubscribe link — sending without one
    // isn't a degraded-but-acceptable fallback, it's a compliance problem.
    // Newsletters just wait for the next tick rather than erroring loudly;
    // whoever set SITE_URL up (or didn't) will notice via the stuck
    // "Scheduled" status in the UI.
    console.log("SITE_URL isn't set — skipping this run (needed to build unsubscribe links).");
    return;
  }

  const dueForSending = await db.newsletter.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    select: { id: true },
  });
  for (const newsletter of dueForSending) {
    await db.newsletter.update({ where: { id: newsletter.id }, data: { status: "SENDING" } });
  }
  if (dueForSending.length > 0) {
    console.log(`${dueForSending.length} newsletter(s) now sending.`);
  }

  const sender = await getNewsletterSender();
  const pending = await db.newsletterRecipient.findMany({
    where: { status: "PENDING", newsletter: { status: "SENDING" } },
    take: BATCH_SIZE,
    include: {
      newsletter: { select: { id: true, subject: true, bodyMarkdown: true } },
      contact: { select: { email: true } },
    },
  });

  if (pending.length === 0) {
    console.log("No newsletter recipients due.");
  } else if (!sender) {
    console.log(`${pending.length} recipient(s) waiting, but no sending mailbox is configured (Settings → Newsletter).`);
  } else {
    for (const recipient of pending) {
      const email = recipient.contact.email;
      if (!email) {
        // Shouldn't happen — materializeNewsletterRecipients already filters
        // to contacts with an email — but a contact's email could in theory
        // be cleared after materialization and before this runs.
        await db.newsletterRecipient.update({
          where: { id: recipient.id },
          data: { status: "FAILED", error: "Contact no longer has an email address." },
        });
        continue;
      }
      try {
        const unsubscribeUrl = `${siteOrigin}/unsubscribe/${recipient.unsubscribeToken}`;
        const bodyHtml = renderNewsletterBodyHtml(recipient.newsletter.bodyMarkdown);
        await sendNewsletterEmail(sender, {
          to: email,
          subject: recipient.newsletter.subject,
          text: recipient.newsletter.bodyMarkdown,
          html: wrapNewsletterHtml({ bodyHtml, unsubscribeUrl }),
        });
        await db.newsletterRecipient.update({
          where: { id: recipient.id },
          data: { status: "SENT", sentAt: new Date() },
        });
        console.log(`${email}: sent "${recipient.newsletter.subject}".`);
      } catch (error) {
        console.error(`${email}: send failed —`, error instanceof Error ? error.message : error);
        await db.newsletterRecipient
          .update({
            where: { id: recipient.id },
            data: { status: "FAILED", error: error instanceof Error ? error.message : "Send failed" },
          })
          .catch(() => {});
      }
      await sleep(DELAY_BETWEEN_SENDS_MS);
    }
  }

  const sending = await db.newsletter.findMany({
    where: { status: "SENDING" },
    select: { id: true, _count: { select: { recipients: { where: { status: "PENDING" } } } } },
  });
  for (const newsletter of sending) {
    if (newsletter._count.recipients === 0) {
      await db.newsletter.update({ where: { id: newsletter.id }, data: { status: "SENT", sentAt: new Date() } });
      console.log(`Newsletter ${newsletter.id}: all recipients processed — marked sent.`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
