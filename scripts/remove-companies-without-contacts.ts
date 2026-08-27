import "dotenv/config";
import { parseArgs } from "node:util";
import { db } from "../src/lib/db";

const { values } = parseArgs({ options: { yes: { type: "boolean" } } });

function companyLabel(company: { name: string; domain: string | null; id: string }) {
  const domain = company.domain ? ` (${company.domain})` : "";
  return `${company.name}${domain} (id: ${company.id})`;
}

async function main() {
  const companies = await db.company.findMany({
    where: { contacts: { none: {} } },
    select: {
      id: true,
      name: true,
      domain: true,
      _count: { select: { deals: true, tasks: true, activities: true, resources: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const total = await db.company.count();
  if (companies.length === 0) {
    console.log(`No companies without a contact found (${total} companies total).`);
    return;
  }

  const hasHistory = (c: (typeof companies)[number]) =>
    c._count.deals > 0 || c._count.tasks > 0 || c._count.activities > 0 || c._count.resources > 0;
  const clean = companies.filter((c) => !hasHistory(c));
  const withHistory = companies.filter(hasHistory);

  console.log(`Found ${companies.length} compan${companies.length === 1 ? "y" : "ies"} with no linked contact (out of ${total} total).\n`);
  console.log(
    "A company can legitimately have no contact yet — just added before anyone was entered. Review this list before running --yes.\n",
  );

  console.log(`${clean.length} with no linked deals/tasks/activity/resources (eligible for --yes):`);
  for (const c of clean) console.log(`  - ${companyLabel(c)}`);

  if (withHistory.length > 0) {
    console.log(
      `\n${withHistory.length} WITH linked history — never deleted by --yes. Deleting a company cascades to its ` +
        "tasks, activity log, and resource links; linked deals are kept but unlinked (companyId set to null):",
    );
    for (const c of withHistory) {
      const parts = [
        c._count.deals && `${c._count.deals} deal(s)`,
        c._count.tasks && `${c._count.tasks} task(s)`,
        c._count.activities && `${c._count.activities} activit${c._count.activities === 1 ? "y" : "ies"}`,
        c._count.resources && `${c._count.resources} resource(s)`,
      ]
        .filter(Boolean)
        .join(", ");
      console.log(`  - ${companyLabel(c)} — ${parts}`);
    }
  }

  if (!values.yes) {
    console.log(`\nNothing deleted. Re-run with --yes to delete the ${clean.length} compan${clean.length === 1 ? "y" : "ies"} with no linked history:`);
    console.log("  npm run remove-companies-without-contacts -- --yes");
    if (withHistory.length > 0) {
      console.log(`${withHistory.length} compan${withHistory.length === 1 ? "y" : "ies"} with linked history ${withHistory.length === 1 ? "is" : "are"} never touched by this script — review those manually.`);
    }
    return;
  }

  console.log(`\nDeleting ${clean.length} compan${clean.length === 1 ? "y" : "ies"} with no linked history…`);
  const result = await db.company.deleteMany({ where: { id: { in: clean.map((c) => c.id) } } });
  console.log(`Done. Deleted ${result.count} compan${result.count === 1 ? "y" : "ies"}.`);
  if (withHistory.length > 0) {
    console.log(`${withHistory.length} compan${withHistory.length === 1 ? "y" : "ies"} with linked history ${withHistory.length === 1 ? "was" : "were"} left untouched.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
