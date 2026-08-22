import { PageHeader } from "@/components/ui/page-header";
import { ImportForm } from "@/components/contacts/import-form";
import { requireAdmin } from "@/lib/auth/dal";

export default async function ImportContactsPage() {
  await requireAdmin();
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Import contacts"
        description="Upload a CSV exported from Google Contacts (Export → Google CSV). Review the preview before anything is saved."
      />
      <ImportForm />
    </div>
  );
}
