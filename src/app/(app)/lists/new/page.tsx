import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ContactListForm } from "@/components/lists/contact-list-form";
import { requireAdmin } from "@/lib/auth/dal";

export default async function NewListPage() {
  await requireAdmin();

  return (
    <div className="max-w-2xl">
      <PageHeader title="New list" />
      <Card>
        <CardBody>
          <ContactListForm />
        </CardBody>
      </Card>
    </div>
  );
}
