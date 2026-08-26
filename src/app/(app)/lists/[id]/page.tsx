import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getListContacts } from "@/lib/contact-list-query";
import { getActiveSequences } from "@/lib/sequences";
import { DYNAMIC_LIST_TEMPLATES, readTemplateKey } from "@/lib/contact-lists";
import { addContactToList, deleteList, removeContactFromList } from "@/app/actions/contact-lists";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { ContactAvatar } from "@/components/contacts/contact-avatar";
import { BulkEnrollForm } from "@/components/lists/bulk-enroll-form";
import { fullName } from "@/lib/format";
import { LIFECYCLE_STAGE_BADGE_CLASSES, LIFECYCLE_STAGE_LABELS } from "@/lib/labels";
import { requireAdmin } from "@/lib/auth/dal";

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const list = await db.contactList.findUnique({ where: { id } });
  if (!list) notFound();

  const [members, sequences] = await Promise.all([getListContacts(list), getActiveSequences()]);

  const availableContacts =
    list.type === "STATIC"
      ? await db.contact.findMany({
          where: { NOT: { listMemberships: { some: { listId: list.id } } } },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          select: { id: true, firstName: true, lastName: true },
        })
      : [];

  const templateKey = list.type === "DYNAMIC" ? readTemplateKey(list.filterDefinition) : null;

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Lists", href: "/lists" }, { label: list.name }]}
        title={list.name}
        description={`${members.length} ${members.length === 1 ? "contact" : "contacts"}`}
        actions={
          <form action={deleteList.bind(null, list.id)}>
            <ConfirmSubmitButton
              variant="secondary"
              confirmMessage={`Delete "${list.name}"? This can't be undone.`}
            >
              Delete list
            </ConfirmSubmitButton>
          </form>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Badge
          className={
            list.type === "DYNAMIC"
              ? "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-500/30"
              : "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30"
          }
        >
          {list.type === "DYNAMIC" ? "Dynamic" : "Static"}
        </Badge>
        {templateKey && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {DYNAMIC_LIST_TEMPLATES[templateKey].description}
          </span>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Enroll in a sequence</CardTitle>
          </CardHeader>
          <CardBody>
            <BulkEnrollForm listId={list.id} sequences={sequences} />
          </CardBody>
        </Card>

        {list.type === "STATIC" && (
          <Card>
            <CardBody>
              <form action={addContactToList.bind(null, list.id)} className="flex items-end gap-2">
                <Select name="contactId" required defaultValue="" className="flex-1">
                  <option value="" disabled>
                    {availableContacts.length === 0 ? "Every contact is already in this list" : "Add a contact…"}
                  </option>
                  {availableContacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {fullName(contact.firstName, contact.lastName)}
                    </option>
                  ))}
                </Select>
                <Button type="submit" size="sm" disabled={availableContacts.length === 0}>
                  Add
                </Button>
              </form>
            </CardBody>
          </Card>
        )}

        <Card>
          {members.length === 0 ? (
            <CardBody>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {list.type === "DYNAMIC"
                  ? "No contacts currently match this template."
                  : "No contacts in this list yet."}
              </p>
            </CardBody>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {members.map((contact) => (
                <li key={contact.id} className="flex items-center gap-3 px-5 py-4">
                  <Link href={`/contacts/${contact.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <ContactAvatar
                      photoUrl={contact.photoUrl}
                      name={fullName(contact.firstName, contact.lastName)}
                      className="h-9 w-9 text-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {fullName(contact.firstName, contact.lastName)}
                      </p>
                      <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                        {[contact.title, contact.company?.name].filter(Boolean).join(" at ") ||
                          contact.email ||
                          "—"}
                      </p>
                    </div>
                  </Link>
                  {contact.lifecycleStage && (
                    <Badge className={`shrink-0 ${LIFECYCLE_STAGE_BADGE_CLASSES[contact.lifecycleStage]}`}>
                      {LIFECYCLE_STAGE_LABELS[contact.lifecycleStage]}
                    </Badge>
                  )}
                  {list.type === "STATIC" && (
                    <form action={removeContactFromList.bind(null, list.id)} className="shrink-0">
                      <input type="hidden" name="contactId" value={contact.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        Remove
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
