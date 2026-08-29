import "dotenv/config";
import { runEmailTaskDigests } from "../src/lib/task-digest";

// Manual/troubleshooting entrypoint — the cron job runs this same logic
// (via runEmailTaskDigests) as part of `npm run sync-email`, so this script
// isn't itself part of the recommended cron setup anymore (see README).
// Useful for confirming a mailbox's digest works without waiting for the
// next sync, or for triggering a resend once its 20h rate limit has
// passed.
async function main() {
  const result = await runEmailTaskDigests();

  if (result.sent.length === 0 && result.skipped.length === 0) {
    console.log("No connected mailboxes — nothing to digest.");
    return;
  }

  for (const { email, taskCount } of result.sent) {
    console.log(`${email}: sent digest, ${taskCount} task(s).`);
  }
  for (const { email, reason } of result.skipped) {
    console.log(`${email}: ${reason} — no email sent.`);
  }
  for (const { email, error } of result.failed) {
    console.error(`${email}: digest send failed — ${error}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
