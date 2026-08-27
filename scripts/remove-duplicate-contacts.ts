import "dotenv/config";
import { parseArgs } from "node:util";
import { db } from "../src/lib/db";
import { phoneMatchKey, isValidPhoneFormat } from "../src/lib/phone";
import { isValidEmailFormat } from "../src/lib/email-format";

const { values } = parseArgs({ options: { yes: { type: "boolean" } } });

type ContactRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  createdAt: Date;
  companyId: string | null;
  company: { name: string } | null;
  _count: { deals: number; tasks: number; activities: number; bookings: number; sequenceEnrollments: number };
};

type OrphanCandidate = {
  id: string;
  name: string;
  domain: string | null;
  _count: { deals: number; tasks: number; activities: number; resources: number };
};

function companyHasHistory(c: OrphanCandidate) {
  return c._count.deals > 0 || c._count.tasks > 0 || c._count.activities > 0 || c._count.resources > 0;
}

function companyLabel(c: OrphanCandidate) {
  const domain = c.domain ? ` (${c.domain})` : "";
  return `${c.name}${domain} (id: ${c.id})`;
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

function formatIssues(c: ContactRow): string {
  const issues: string[] = [];
  const email = c.email?.trim();
  const phone = c.phone?.trim();
  if (email && !isValidEmailFormat(email)) issues.push(`bad email "${email}"`);
  if (phone && !isValidPhoneFormat(phone)) issues.push(`bad phone "${phone}"`);
  return issues.join(", ");
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
      companyId: true,
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
    if (contact.phone?.trim()) pushToMapArray(byKey, `phone:${phoneMatchKey(contact.phone.trim())}`, contact.id);
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

  const toDelete: ContactRow[] = [];
  const needsReview: ContactRow[][] = [];

  if (duplicateGroups.length === 0) {
    console.log(`No duplicate contacts found (${contacts.length} contacts have a phone or email, out of ${total} total).`);
  } else {
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
  }

  // Contacts with a badly-formatted email or phone — skipping anything
  // already scheduled for deletion above so it's never listed twice.
  const dedupDeleteIds = new Set(toDelete.map((c) => c.id));
  const invalidFormat = contacts.filter((c) => !dedupDeleteIds.has(c.id) && formatIssues(c) !== "");
  const invalidFormatClean = invalidFormat.filter((c) => historyCount(c) === 0);
  const invalidFormatWithHistory = invalidFormat.filter((c) => historyCount(c) > 0);

  if (invalidFormat.length > 0) {
    console.log(
      `\nFound ${invalidFormat.length} more contact(s) with a badly-formatted email or phone ` +
        `(${invalidFormatClean.length} eligible for --yes, ${invalidFormatWithHistory.length} with linked history — never auto-removed):`,
    );
    for (const c of invalidFormatClean) console.log(`  - ${contactLabel(c)} — ${formatIssues(c)}`);
    for (const c of invalidFormatWithHistory) console.log(`  - ${contactLabel(c)} — ${formatIssues(c)}, has linked history`);
  }

  // A company can end up with zero contacts once these are gone — checked
  // against its FULL current contact list (not just the phone/email subset
  // scanned above), since a contact with neither would still keep the
  // company from being orphaned.
  const contactDeleteIds = new Set([...toDelete, ...invalidFormatClean].map((c) => c.id));
  const affectedCompanyIds = [
    ...new Set([...toDelete, ...invalidFormatClean].map((c) => c.companyId).filter((id): id is string => Boolean(id))),
  ];
  let orphanCandidates: OrphanCandidate[] = [];
  if (affectedCompanyIds.length > 0) {
    const affectedCompanies = await db.company.findMany({
      where: { id: { in: affectedCompanyIds } },
      select: {
        id: true,
        name: true,
        domain: true,
        contacts: { select: { id: true } },
        _count: { select: { deals: true, tasks: true, activities: true, resources: true } },
      },
    });
    orphanCandidates = affectedCompanies.filter((company) => company.contacts.every((c) => contactDeleteIds.has(c.id)));
  }
  const orphanClean = orphanCandidates.filter((c) => !companyHasHistory(c));
  const orphanWithHistory = orphanCandidates.filter(companyHasHistory);

  if (orphanCandidates.length > 0) {
    console.log(
      `\nDeleting those contacts would also leave ${orphanCandidates.length} compan${orphanCandidates.length === 1 ? "y" : "ies"} with no contacts left:`,
    );
    for (const c of orphanClean) console.log(`  - ${companyLabel(c)}`);
    for (const c of orphanWithHistory) console.log(`  - ${companyLabel(c)} — has linked history, won't be auto-removed`);
  }

  const totalToDelete = toDelete.length + invalidFormatClean.length;

  if (!values.yes) {
    console.log(`\nNothing deleted.${totalToDelete > 0 ? ` Re-run with --yes to delete the ${totalToDelete} contact(s) listed above:` : ""}`);
    if (totalToDelete > 0) console.log("  npm run remove-duplicate-contacts -- --yes");
    return;
  }

  if (totalToDelete === 0) {
    console.log("\nNothing to delete.");
    return;
  }

  console.log(
    `\nDeleting ${totalToDelete} contact(s) (${toDelete.length} duplicate, ${invalidFormatClean.length} badly-formatted)…`,
  );
  const result = await db.contact.deleteMany({ where: { id: { in: [...contactDeleteIds] } } });
  console.log(`Done. Deleted ${result.count} contact(s).`);
  if (needsReview.length > 0) {
    console.log(`${needsReview.length} group(s) with conflicting history were left untouched — review those manually.`);
  }
  if (invalidFormatWithHistory.length > 0) {
    console.log(
      `${invalidFormatWithHistory.length} badly-formatted contact(s) with linked history were left untouched — review those manually.`,
    );
  }

  if (orphanClean.length > 0) {
    console.log(`\nDeleting ${orphanClean.length} compan${orphanClean.length === 1 ? "y" : "ies"} left with no contacts…`);
    const companyResult = await db.company.deleteMany({ where: { id: { in: orphanClean.map((c) => c.id) } } });
    console.log(`Done. Deleted ${companyResult.count} compan${companyResult.count === 1 ? "y" : "ies"}.`);
  }
  if (orphanWithHistory.length > 0) {
    console.log(
      `${orphanWithHistory.length} compan${orphanWithHistory.length === 1 ? "y" : "ies"} left with no contacts but WITH linked history — not removed, review manually:`,
    );
    for (const c of orphanWithHistory) console.log(`  - ${companyLabel(c)}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
