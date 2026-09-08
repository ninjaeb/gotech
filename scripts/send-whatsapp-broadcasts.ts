import "dotenv/config";
import { db } from "../src/lib/db";
import { WHATSAPP_ACCOUNT_ID, sendWhatsAppTemplateMessage } from "../src/lib/whatsapp";
import { NEW_UPDATE_TEMPLATE_NAME, NEW_UPDATE_TEMPLATE_LANGUAGE } from "../src/lib/whatsapp-broadcast";

// Run on a schedule (cPanel Cron Job — see README), same
// materialize-once/work-through-in-paced-batches pattern as
// send-newsletters.ts, and for the same reason: a large audience can't be
// sent in one request without risking the WhatsApp account's own rate/tier
// limits, and this makes a partial run resumable across ticks.
const BATCH_SIZE = 40;
const DELAY_BETWEEN_SENDS_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const account = await db.whatsAppAccount.findUnique({ where: { id: WHATSAPP_ACCOUNT_ID } });

  const pending = await db.whatsAppBroadcastRecipient.findMany({
    where: { status: "PENDING", broadcast: { status: "SENDING" } },
    take: BATCH_SIZE,
    include: {
      broadcast: { select: { id: true, headline: true, link: true } },
      contact: { select: { phone: true } },
    },
  });

  if (pending.length === 0) {
    console.log("No WhatsApp broadcast recipients due.");
  } else if (!account) {
    console.log(`${pending.length} recipient(s) waiting, but WhatsApp Business isn't connected.`);
  } else {
    for (const recipient of pending) {
      const phone = recipient.contact.phone;
      if (!phone) {
        // Shouldn't happen — materializeWhatsAppBroadcastRecipients already
        // filters to contacts with a phone — but it could in theory be
        // cleared after materialization and before this runs.
        await db.whatsAppBroadcastRecipient.update({
          where: { id: recipient.id },
          data: { status: "FAILED", error: "Contact no longer has a phone number." },
        });
        continue;
      }
      try {
        await sendWhatsAppTemplateMessage(account, phone, NEW_UPDATE_TEMPLATE_NAME, NEW_UPDATE_TEMPLATE_LANGUAGE, [
          recipient.broadcast.headline,
          recipient.broadcast.link,
        ]);
        await db.whatsAppBroadcastRecipient.update({
          where: { id: recipient.id },
          data: { status: "SENT", sentAt: new Date() },
        });
        console.log(`${phone}: sent "${recipient.broadcast.headline}".`);
      } catch (error) {
        console.error(`${phone}: send failed —`, error instanceof Error ? error.message : error);
        await db.whatsAppBroadcastRecipient
          .update({
            where: { id: recipient.id },
            data: { status: "FAILED", error: error instanceof Error ? error.message : "Send failed" },
          })
          .catch(() => {});
      }
      await sleep(DELAY_BETWEEN_SENDS_MS);
    }
  }

  const sending = await db.whatsAppBroadcast.findMany({
    where: { status: "SENDING" },
    select: { id: true, _count: { select: { recipients: { where: { status: "PENDING" } } } } },
  });
  for (const broadcast of sending) {
    if (broadcast._count.recipients === 0) {
      await db.whatsAppBroadcast.update({ where: { id: broadcast.id }, data: { status: "SENT", sentAt: new Date() } });
      console.log(`WhatsApp broadcast ${broadcast.id}: all recipients processed — marked sent.`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
