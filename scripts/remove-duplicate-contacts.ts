import "dotenv/config";
import { parseArgs } from "node:util";
import { db } from "../src/lib/db";

const { values } = parseArgs({ options: { yes: { type: "boolean" } } });

type ContactRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  createdAt: Date;
  company: { name: string } | null;
  _count: { deals: number; tasks: number; activities: number; bookings: number; sequenceEnrollments: number };
};

function historyCount(c: ContactRow) {
  return c._count.deals + c._count.tasks + c._count.activities + c._count.bookings + c._count.sequenceEnrollments;
}

function historyParts(c: ContactRow) {
  return [
    c._count.deals && `${c._count.deals} deal(s)`,
    c._count.tasks && `${c._count.tasks} task(s)`,
    c._count.activities && `${c._count.activities} activit${c._count.activities === 1 ? "y" : "ies"}`,
    c._count.bookings && `${c._count.bookings} booking(s)`,
    c._count.sequenceEnrollments && `${c._count.sequenceEnrollments} sequence enrollment(s)`,
  ]
    .filter(Boolean)
    .join(", ");
}

function contactLabel(c: ContactRow) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || "(no name)";
  const company = c.company ? ` @ ${c.company.name}` : "";
  const created = c.createdAt.toISOString().slice(0, 10);
  const history = historyParts(c);
  return `${name} <${c.email}>${company} — created ${created}${history ? `, ${history}` : ""} (id: ${c.id})`;
}

async function main() {
  // "Duplicate" = same email, case-insensitively — the same signal the CSV
  // import's own duplicate detection already uses (matches how MySQL's
  // utf8mb4_unicode_ci collation already treats email equality).
  const contacts = await db.contact.findMany({
    where: { AND: [{ email: { not: null } }, { email: { not: "" } }] },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
      company: { select: { name: true } },
      _count: {
        select: { deals: true, tasks: true, activities: true, bookings: true, sequenceEnrollments: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, ContactRow[]>();
  for (const contact of contacts) {
    const key = contact.email!.toLowerCase();
    const group = groups.get(key);
    if (group) group.push(contact);
    else groups.set(key, [contact]);
  }
  const duplicateGroups = [...groups.values()].filter((group) => group.length > 1);

  const total = await db.contact.count();
  if (duplicateGroups.length === 0) {
    console.log(`No duplicate contacts found (${contacts.length} contacts have an email, out of ${total} total).`);
    return;
  }

  const toDelete: ContactRow[] = [];
  const needsReview: ContactRow[][] = [];

  for (const group of duplicateGroups) {
    const withHistory = group.filter((c) => historyCount(c) > 0);
    if (withHistory.length >= 2) {
      // More than one contact in this group has its own real history —
      // deleting either would silently lose data, and merging isn't
      // something this script does. Leave the whole group for manual review.
      needsReview.push(group);
      continue;
    }
    // Keep whichever contact has history, if any; otherwise keep the oldest
    // (contacts arrive already sorted by createdAt asc, so group[0] is it).
    const keeper = withHistory[0] ?? group[0];
    for (const contact of group) {
      if (contact.id !== keeper.id) toDelete.push(contact);
    }
  }

  const duplicateContactCount = duplicateGroups.reduce((sum, group) => sum + group.length, 0);
  console.log(
    `Found ${duplicateGroups.length} email address(es) shared by more than one contact ` +
      `(${duplicateContactCount} contacts total, out of ${total}).\n`,
  );

  if (toDelete.length > 0) {
    console.log(`${toDelete.length} contact(s) eligible for --yes (the other one in their group is kept):`);
    for (const contact of toDelete) console.log(`  - ${contactLabel(contact)}`);
  } else {
    console.log("None are safe to auto-remove — every duplicate group needs manual review (see below).");
  }

  if (needsReview.length > 0) {
    console.log(
      `\n${needsReview.length} group(s) need manual review — more than one contact per email has its own ` +
        "linked history, so this script won't guess who to keep:",
    );
    for (const group of needsReview) {
      console.log(`  ${group[0].email}:`);
      for (const contact of group) console.log(`    - ${contactLabel(contact)}`);
    }
  }

  if (!values.yes) {
    console.log(`\nNothing deleted.${toDelete.length > 0 ? ` Re-run with --yes to delete the ${toDelete.length} contact(s) listed above:` : ""}`);
    if (toDelete.length > 0) console.log("  npm run remove-duplicate-contacts -- --yes");
    return;
  }

  if (toDelete.length === 0) {
    console.log("\nNothing to delete.");
    return;
  }

  console.log(`\nDeleting ${toDelete.length} duplicate contact(s)…`);
  const result = await db.contact.deleteMany({ where: { id: { in: toDelete.map((c) => c.id) } } });
  console.log(`Done. Deleted ${result.count} contact(s).`);
  if (needsReview.length > 0) {
    console.log(`${needsReview.length} group(s) with conflicting history were left untouched — review those manually.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
