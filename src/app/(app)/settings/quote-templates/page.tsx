import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteQuoteTemplate } from "@/app/actions/quote-templates";
import { requireAdmin } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { getCurrency } from "@/lib/settings";
import { formatCurrency } from "@/lib/format";
import { quoteTotal } from "@/lib/quotes";

export default async function QuoteTemplatesPage() {
  await requireAdmin();
  const [templates, currency] = await Promise.all([
    db.quoteTemplate.findMany({ orderBy: { name: "asc" }, include: { items: true } }),
    getCurrency(),
  ]);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Quote templates" }]}
        title="Quote templates"
        description="Save a full set of line items once, then start any new quote from it instead of building one from scratch."
        actions={
          <Link href="/settings/quote-templates/new" className={buttonClasses()}>
            <Plus className="h-4 w-4" />
            New template
          </Link>
        }
      />
      <Card>
        <CardBody>
          {templates.length === 0 ? (
            <EmptyState
              title="No templates yet"
              description="Create one to start reusing a common set of quote line items."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {templates.map((template) => (
                <li key={template.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-200">{template.name}</p>
                    <p className="truncate text-xs text-slate-400">
                      {template.items.length} {template.items.length === 1 ? "item" : "items"} ·{" "}
                      {formatCurrency(quoteTotal(template.items), currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/settings/quote-templates/${template.id}`}
                      title="Edit"
                      aria-label="Edit"
                      className={buttonClasses("secondary", "sm")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <form action={deleteQuoteTemplate.bind(null, template.id)}>
                      <ConfirmSubmitButton confirmMessage={`Delete the "${template.name}" template?`} size="sm">
                        <Trash2 className="h-3.5 w-3.5" />
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
