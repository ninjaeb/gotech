import "dotenv/config";
import { parseArgs } from "node:util";
import { db } from "../src/lib/db";

const { values } = parseArgs({ options: { yes: { type: "boolean" } } });

type ContactRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  createdAt: Date;
  company: { name: string } | null;
  _count: { deals: number; tasks: number; activities: number; bookings: number; sequenceEnrollments: number };
};

// Only strips a leading "+" — "+60123456789" and "60123456789" link up, but
// this doesn't touch spaces/dashes/other formatting differences.
function normalizePhone(phone: string) {
  return phone.replace(/^\+/, "");
}

// Two contacts can be linked by phone while a third links to one of them by
// email — those three are really one cluster, not two separate pairs. Plain
// union-find turns "shares a phone or email with" into that cluster.
class UnionFind {
  private parent = new Map<string, string>();
  private root(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    const p = this.parent.get(x)!;
    if (p === x) return x;
    const r = this.root(p);
    this.parent.set(x, r);
    return r;
  }
  union(a: string, b: string) {
    const ra = this.root(a);
    const rb = this.root(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
  find(x: string) {
    return this.root(x);
  }
}

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

function pushToMapArray<K>(map: Map<K, string[]>, key: K, value: string) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function contactLabel(c: ContactRow) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || "(no name)";
  const contactInfo = [c.email, c.phone].filter(Boolean).join(" / ") || "no email or phone";
  const company = c.company ? ` @ ${c.company.name}` : "";
  const created = c.createdAt.toISOString().slice(0, 10);
  const history = historyParts(c);
  const photo = c.photoUrl ? ", has photo" : "";
  return `${name} <${contactInfo}>${company} — created ${created}${history ? `, ${history}` : ""}${photo} (id: ${c.id})`;
}

async function main() {
  // "Duplicate" = same phone (ignoring a leading "+"), or same email
  // (case-insensitively). No other formatting normalization — e.g. spaces
  // or dashes in a phone number still have to match exactly.
  const contacts = await db.contact.findMany({
    where: {
      OR: [
        { AND: [{ phone: { not: null } }, { phone: { not: "" } }] },
        { AND: [{ email: { not: null } }, { email: { not: "" } }] },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      photoUrl: true,
      createdAt: true,
      company: { select: { name: true } },
      _count: {
        select: { deals: true, tasks: true, activities: true, bookings: true, sequenceEnrollments: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const uf = new UnionFind();
  const byKey = new Map<string, string[]>();
  for (const contact of contacts) {
    uf.find(contact.id);
    if (contact.phone?.trim()) pushToMapArray(byKey, `phone:${normalizePhone(contact.phone.trim())}`, contact.id);
    if (contact.email?.trim()) pushToMapArray(byKey, `email:${contact.email.trim().toLowerCase()}`, contact.id);
  }
  for (const ids of byKey.values()) {
    for (let i = 1; i < ids.length; i++) uf.union(ids[0], ids[i]);
  }

  const clusters = new Map<string, ContactRow[]>();
  for (const contact of contacts) {
    const root = uf.find(contact.id);
    const cluster = clusters.get(root);
    if (cluster) cluster.push(contact);
    else clusters.set(root, [contact]);
  }
  const duplicateGroups = [...clusters.values()].filter((group) => group.length > 1);

  const total = await db.contact.count();
  if (duplicateGroups.length === 0) {
    console.log(`No duplicate contacts found (${contacts.length} contacts have a phone or email, out of ${total} total).`);
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
    // Keep whichever contact has history, if any. Otherwise prefer one with
    // a photo (a more complete record). Otherwise keep the oldest (contacts
    // arrive already sorted by createdAt asc, so group[0]/withPhoto[0] is it).
    const withPhoto = group.filter((c) => c.photoUrl);
    const keeper = withHistory[0] ?? withPhoto[0] ?? group[0];
    for (const contact of group) {
      if (contact.id !== keeper.id) toDelete.push(contact);
    }
  }

  const duplicateContactCount = duplicateGroups.reduce((sum, group) => sum + group.length, 0);
  console.log(
    `Found ${duplicateGroups.length} group(s) of contacts sharing a phone or email ` +
      `(${duplicateContactCount} contacts total, out of ${total}).\n`,
  );

  if (toDelete.length > 0) {
    console.log(`${toDelete.length} contact(s) eligible for --yes (one contact per group is kept):`);
    for (const contact of toDelete) console.log(`  - ${contactLabel(contact)}`);
  } else {
    console.log("None are safe to auto-remove — every duplicate group needs manual review (see below).");
  }

  if (needsReview.length > 0) {
    console.log(
      `\n${needsReview.length} group(s) need manual review — more than one contact per group has its own ` +
        "linked history, so this script won't guess who to keep:",
    );
    for (const group of needsReview) {
      console.log(`  Group (matched by shared phone and/or email):`);
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
