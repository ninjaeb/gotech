import { PageHeader } from "@/components/ui/page-header";
import { ImportForm } from "@/components/contacts/import-form";

export default function ImportContactsPage() {
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
