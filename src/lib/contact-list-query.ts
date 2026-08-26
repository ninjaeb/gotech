import { db } from "@/lib/db";
import { DYNAMIC_LIST_TEMPLATES, readTemplateKey } from "@/lib/contact-lists";

// Split from contact-lists.ts (which stays free of `db`/Prisma-client
// imports) because DYNAMIC_LIST_TEMPLATES is also imported by the
// create-list form, a Client Component — pulling `db` into that bundle
// would drag the whole Prisma Client into the browser.
const CONTACT_LIST_INCLUDE = { company: true } as const;

export async function getListContacts(list: {
  id: string;
  type: "STATIC" | "DYNAMIC";
  filterDefinition: unknown;
}) {
  if (list.type === "DYNAMIC") {
    const key = readTemplateKey(list.filterDefinition);
    if (!key) return [];
    return db.contact.findMany({
      where: DYNAMIC_LIST_TEMPLATES[key].where(),
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      include: CONTACT_LIST_INCLUDE,
    });
  }

  const members = await db.contactListMember.findMany({
    where: { listId: list.id },
    orderBy: { addedAt: "desc" },
    include: { contact: { include: CONTACT_LIST_INCLUDE } },
  });
  return members.map((member) => member.contact);
}

export async function getListContactCount(list: {
  id: string;
  type: "STATIC" | "DYNAMIC";
  filterDefinition: unknown;
}) {
  if (list.type === "DYNAMIC") {
    const key = readTemplateKey(list.filterDefinition);
    if (!key) return 0;
    return db.contact.count({ where: DYNAMIC_LIST_TEMPLATES[key].where() });
  }
  return db.contactListMember.count({ where: { listId: list.id } });
}
