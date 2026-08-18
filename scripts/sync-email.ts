import "dotenv/config";
import { db } from "../src/lib/db";
import { syncEmailAccount } from "../src/lib/email";

// Run on a schedule (cPanel Cron Job — see README) to log new mail as
// Activities. Loops over every connected mailbox rather than just one, since
// each user can connect their own; one account's failure doesn't stop the
// rest from syncing.
async function main() {
  const accounts = await db.emailAccount.findMany({ include: { user: { select: { email: true } } } });
  if (accounts.length === 0) {
    console.log("No connected mailboxes to sync.");
    return;
  }

  for (const account of accounts) {
    try {
      const { logged } = await syncEmailAccount(account);
      console.log(`${account.user.email}: synced, ${logged} new email(s) logged.`);
    } catch (error) {
      console.error(`${account.user.email}: sync failed —`, error instanceof Error ? error.message : error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
