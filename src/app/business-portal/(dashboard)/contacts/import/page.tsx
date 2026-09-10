import { PageHeader } from "@/components/ui/page-header";
import { PartnerImportForm } from "@/components/business-crm/partner-import-form";
import { requireCompletePartnerProfile } from "@/lib/auth/dal";

export default async function ImportPartnerContactsPage() {
  await requireCompletePartnerProfile();
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Contacts", href: "/business-portal/contacts" }, { label: "Import" }]}
        title="Import contacts"
        description="Upload a CSV or Excel export from Google Contacts, another CRM, or your own spreadsheet. Review the preview before anything is saved."
      />
      <PartnerImportForm />
    </div>
  );
}
