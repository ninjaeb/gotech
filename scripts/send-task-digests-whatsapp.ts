import "dotenv/config";
import { runTaskReminders } from "../src/lib/task-reminder";

// Manual/troubleshooting entrypoint — the cron job runs this same logic
// (via runTaskReminders) as part of `npm run sync-email`, so this script
// isn't itself part of the recommended cron setup anymore (see README).
//
// Bypasses the configured-send-hour check and each user's own 20h rate
// limit, for manually testing or troubleshooting a send right now:
//   npm run send-task-digests-whatsapp -- --force
const FORCE = process.argv.includes("--force");

async function main() {
  const result = await runTaskReminders({ force: FORCE });

  if (!result.ok) {
    console.log(`${result.message} Nothing to digest.`);
    return;
  }

  for (const { name, overdueCount, dueTodayCount } of result.sent) {
    console.log(`${name}: sent WhatsApp digest, ${overdueCount} overdue / ${dueTodayCount} due today.`);
  }
  for (const { name, reason } of result.skipped) {
    console.log(`${name}: ${reason} — no WhatsApp message sent.`);
  }
  for (const { name, error } of result.failed) {
    console.error(`${name}: WhatsApp digest send failed — ${error}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
