import { db } from "@/lib/db";
import { createNewsletter } from "@/app/actions/newsletters";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { NewsletterForm } from "@/components/newsletters/newsletter-form";

export default async function NewNewsletterPage() {
  const lists = await db.contactList.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Newsletters", href: "/system/newsletters" }, { label: "New" }]}
        title="New newsletter"
        description="Saved as a draft first — nothing sends until you schedule it"
      />
      <Card>
        <CardBody>
          <NewsletterForm action={createNewsletter} lists={lists} submitLabel="Create draft" />
        </CardBody>
      </Card>
    </div>
  );
}
