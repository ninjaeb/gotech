import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ContactListForm } from "@/components/lists/contact-list-form";
import { requireAdmin } from "@/lib/auth/dal";

export default async function NewListPage() {
  await requireAdmin();

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Lists", href: "/lists" }, { label: "New list" }]}
        title="New list"
      />
      <Card>
        <CardBody>
          <ContactListForm />
        </CardBody>
      </Card>
    </div>
  );
}
