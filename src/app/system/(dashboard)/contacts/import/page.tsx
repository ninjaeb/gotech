import { PageHeader } from "@/components/ui/page-header";
import { ImportForm } from "@/components/contacts/import-form";
import { requireSales } from "@/lib/auth/dal";

export default async function ImportContactsPage() {
  await requireSales();
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Contacts", href: "/system/contacts" }, { label: "Import" }]}
        title="Import contacts"
        description="Upload a CSV exported from Google Contacts (Export → Google CSV). Review the preview before anything is saved."
      />
      <ImportForm />
    </div>
  );
}
