import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateContact } from "@/app/actions/contacts";
import { ContactForm } from "@/components/contacts/contact-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { fullName } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/dal";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [contact, companies] = await Promise.all([
    db.contact.findUnique({ where: { id } }),
    db.company.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!contact) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader
        breadcrumbs={[
          { label: "Contacts", href: "/contacts" },
          { label: fullName(contact.firstName, contact.lastName), href: `/contacts/${contact.id}` },
          { label: "Edit" },
        ]}
        title={`Edit ${fullName(contact.firstName, contact.lastName)}`}
      />
      <Card>
        <CardBody>
          <ContactForm
            action={updateContact.bind(null, contact.id)}
            contact={contact}
            companies={companies}
            submitLabel="Save changes"
          />
        </CardBody>
      </Card>
    </div>
  );
}
