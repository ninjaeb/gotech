import { requireAdmin } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsLinkCard } from "@/components/settings/settings-link-card";

export default async function SalesSettingsPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Sales" }]}
        title="Sales"
        description="Pipelines, catalog, and quoting"
      />
      <SettingsLinkCard
        href="/settings/pipelines"
        title="Pipelines"
        description="Give each deal type its own stage list — a new-build project, a retainer, a referral don't have to share one kanban."
      />
      <SettingsLinkCard
        href="/settings/products"
        title="Products & Services"
        description="Reusable catalog for building quotes — add each thing you sell once, then pull it into any quote's line items."
      />
      <SettingsLinkCard
        href="/settings/quote-templates"
        title="Quote templates"
        description="Save a full set of line items once, then start any new quote from it instead of building one from scratch."
      />
      <SettingsLinkCard
        href="/settings/sequences"
        title="Sequences"
        description="Multi-step automated email cadences — enroll a contact from their page and it sends itself, stopping the moment they reply."
      />
    </div>
  );
}
