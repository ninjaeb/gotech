import "dotenv/config";
import { parseArgs } from "node:util";
import { db } from "../src/lib/db";

const { values } = parseArgs({ options: { yes: { type: "boolean" } } });

function contactLabel(contact: {
  firstName: string;
  lastName: string | null;
  email: string | null;
  company: { name: string } | null;
  id: string;
}) {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "(no name)";
  const email = contact.email ?? "no email";
  const company = contact.company ? ` @ ${contact.company.name}` : "";
  return `${name} <${email}>${company} (id: ${contact.id})`;
}

async function main() {
  const contacts = await db.contact.findMany({
    where: { OR: [{ phone: null }, { phone: "" }] },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      company: { select: { name: true } },
      _count: {
        select: { deals: true, tasks: true, activities: true, bookings: true, sequenceEnrollments: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const total = await db.contact.count();
  if (contacts.length === 0) {
    console.log(`No contacts without a phone number found (out of ${total} total). Nothing to do.`);
    return;
  }
  console.log(`${total} total contacts in the CRM.`);

  const hasHistory = (c: (typeof contacts)[number]) =>
    c._count.deals > 0 ||
    c._count.tasks > 0 ||
    c._count.activities > 0 ||
    c._count.bookings > 0 ||
    c._count.sequenceEnrollments > 0;
  const clean = contacts.filter((c) => !hasHistory(c));
  const withHistory = contacts.filter(hasHistory);

  console.log(`Found ${contacts.length} contact(s) with no phone number.\n`);

  console.log(`${clean.length} with no linked deals/tasks/activity/bookings/sequences (eligible for --yes):`);
  for (const c of clean) console.log(`  - ${contactLabel(c)}`);

  if (withHistory.length > 0) {
    console.log(
      `\n${withHistory.length} WITH linked history — never deleted by --yes. Deleting a contact cascades to their ` +
        "tasks, activity log, bookings, and sequence enrollments; linked deals are kept but unlinked (contactId set to null):",
    );
    for (const c of withHistory) {
      const parts = [
        c._count.deals && `${c._count.deals} deal(s)`,
        c._count.tasks && `${c._count.tasks} task(s)`,
        c._count.activities && `${c._count.activities} activit${c._count.activities === 1 ? "y" : "ies"}`,
        c._count.bookings && `${c._count.bookings} booking(s)`,
        c._count.sequenceEnrollments && `${c._count.sequenceEnrollments} sequence enrollment(s)`,
      ]
        .filter(Boolean)
        .join(", ");
      console.log(`  - ${contactLabel(c)} — ${parts}`);
    }
  }

  if (!values.yes) {
    console.log(`\nNothing deleted. Re-run with --yes to delete the ${clean.length} contact(s) with no linked history:`);
    console.log("  npm run remove-contacts-without-phone -- --yes");
    if (withHistory.length > 0) {
      console.log(`${withHistory.length} contact(s) with linked history are never touched by this script — review those manually.`);
    }
    return;
  }

  console.log(`\nDeleting ${clean.length} contact(s) with no linked history…`);
  const result = await db.contact.deleteMany({ where: { id: { in: clean.map((c) => c.id) } } });
  console.log(`Done. Deleted ${result.count} contact(s).`);
  if (withHistory.length > 0) {
    console.log(`${withHistory.length} contact(s) with linked history were left untouched.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
