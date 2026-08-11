import "dotenv/config";
import { parseArgs } from "node:util";
import { db } from "../src/lib/db";

const { values } = parseArgs({ options: { yes: { type: "boolean" } } });

async function main() {
  const [companies, contacts, deals, tasks, activities] = await Promise.all([
    db.company.count(),
    db.contact.count(),
    db.deal.count(),
    db.task.count(),
    db.activity.count(),
  ]);

  console.log("This will permanently delete:");
  console.log(`  ${companies} companies, ${contacts} contacts, ${deals} deals, ${tasks} tasks, ${activities} activity entries`);
  console.log("Logins (User table) are not touched.\n");

  if (!values.yes) {
    console.log("Nothing deleted. Re-run with --yes to confirm:");
    console.log("  npm run clear-data -- --yes");
    return;
  }

  console.log("Deleting…");
  await db.activity.deleteMany();
  await db.task.deleteMany();
  await db.deal.deleteMany();
  await db.contact.deleteMany();
  await db.company.deleteMany();
  console.log("Done. The CRM is empty and ready for real data.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
