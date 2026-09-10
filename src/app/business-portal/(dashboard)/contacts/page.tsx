import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { fullName } from "@/lib/format";

export default async function PartnerContactsPage() {
  const user = await requireCompletePartnerProfile();
  const contacts = await db.partnerContact.findMany({
    where: { partnerId: user.id },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    include: { company: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description={`${contacts.length} ${contacts.length === 1 ? "contact" : "contacts"}`}
        actions={
          <Link href="/business-portal/contacts/new" className={buttonClasses()}>
            <Plus className="h-4 w-4" />
            New contact
          </Link>
        }
      />

      <Card>
        <CardBody>
          {contacts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No contacts yet."
              description="Add the people you work with to start linking deals and tasks to them."
              action={
                <Link href="/business-portal/contacts/new" className={buttonClasses()}>
                  <Plus className="h-4 w-4" />
                  New contact
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-neutral-800 dark:text-slate-400">
                    <th className="py-2 pr-3 font-medium">Contact</th>
                    <th className="py-2 pr-3 font-medium">Company</th>
                    <th className="py-2 pr-3 font-medium">Email</th>
                    <th className="py-2 pr-3 font-medium">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/business-portal/contacts/${contact.id}`}
                          className="font-medium text-slate-800 hover:text-petrol dark:text-slate-200 dark:hover:text-petrol-light"
                        >
                          {fullName(contact.firstName, contact.lastName)}
                        </Link>
                        {contact.title && <p className="text-xs text-slate-400">{contact.title}</p>}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{contact.company?.name ?? "—"}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{contact.email ?? "—"}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{contact.phone ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
