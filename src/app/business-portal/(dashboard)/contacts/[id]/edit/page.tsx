import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updatePartnerContact } from "@/app/actions/partner-contacts";
import { PartnerContactForm } from "@/components/business-crm/partner-contact-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";
import { fullName } from "@/lib/format";

export default async function EditPartnerContactPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCompletePartnerProfile();
  const { id } = await params;
  const [contact, companies] = await Promise.all([
    db.partnerContact.findFirst({ where: { id, partnerId: user.id } }),
    db.partnerCompany.findMany({ where: { partnerId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!contact) notFound();
  const name = fullName(contact.firstName, contact.lastName);

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Contacts", href: "/business-portal/contacts" },
          { label: name, href: `/business-portal/contacts/${contact.id}` },
          { label: "Edit" },
        ]}
        title={`Edit ${name}`}
      />
      <Card>
        <CardBody>
          <PartnerContactForm action={updatePartnerContact.bind(null, contact.id)} contact={contact} companies={companies} />
        </CardBody>
      </Card>
    </div>
  );
}
