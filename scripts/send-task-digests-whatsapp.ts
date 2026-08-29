import "dotenv/config";
import { runTaskReminders } from "../src/lib/task-reminder";

// Run hourly (cPanel Cron Job — see README) — the configured send hour
// (Settings → Integrations) is what actually decides when it fires, not the
// cron schedule itself, so cron just needs to run often enough to catch it.
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
