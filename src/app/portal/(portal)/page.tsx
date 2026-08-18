import Link from "next/link";
import { FileText, FolderKanban, Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentClientUser } from "@/lib/portal/dal";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  INVOICE_STATUS_BADGE_CLASSES,
  INVOICE_STATUS_LABELS,
  PROJECT_STATUS_BADGE_CLASSES,
  PROJECT_STATUS_LABELS,
  QUOTE_STATUS_BADGE_CLASSES,
  QUOTE_STATUS_LABELS,
} from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCurrency } from "@/lib/settings";
import { quoteTotal } from "@/lib/quotes";

export default async function PortalDashboardPage() {
  const clientUser = await getCurrentClientUser();

  const [currency, projects, quotes, invoices] = await Promise.all([
    getCurrency(),
    db.project.findMany({
      where: { deal: { companyId: clientUser.companyId } },
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    db.quote.findMany({
      where: { deal: { companyId: clientUser.companyId } },
      select: {
        id: true,
        title: true,
        status: true,
        items: { select: { quantity: true, unitPrice: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.invoice.findMany({
      where: { project: { deal: { companyId: clientUser.companyId } } },
      select: { id: true, title: true, amount: true, status: true, dueDate: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${clientUser.contact.firstName}`}
        description={clientUser.company.name}
      />

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardBody>
          {projects.length === 0 ? (
            <EmptyState title="No projects yet." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/portal/projects/${project.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-indigo-600"
                  >
                    <span className="flex min-w-0 items-center gap-2 truncate font-medium text-slate-800 dark:text-slate-200">
                      <FolderKanban className="h-4 w-4 shrink-0 text-slate-400" />
                      {project.name}
                    </span>
                    <Badge className={PROJECT_STATUS_BADGE_CLASSES[project.status]}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quotes</CardTitle>
        </CardHeader>
        <CardBody>
          {quotes.length === 0 ? (
            <EmptyState title="No quotes yet." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {quotes.map((quote) => (
                <li key={quote.id}>
                  <Link
                    href={`/q/${quote.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-indigo-600"
                  >
                    <span className="flex min-w-0 items-center gap-2 truncate font-medium text-slate-800 dark:text-slate-200">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      {quote.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-slate-500 dark:text-slate-400">
                        {formatCurrency(quoteTotal(quote.items), currency)}
                      </span>
                      <Badge className={QUOTE_STATUS_BADGE_CLASSES[quote.status]}>
                        {QUOTE_STATUS_LABELS[quote.status]}
                      </Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardBody>
          {invoices.length === 0 ? (
            <EmptyState title="No invoices yet." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {invoices.map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2 truncate font-medium text-slate-800 dark:text-slate-200">
                    <Receipt className="h-4 w-4 shrink-0 text-slate-400" />
                    {invoice.title}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-slate-500 dark:text-slate-400">
                      {formatCurrency(invoice.amount.toString(), currency)}
                      {invoice.dueDate && ` · Due ${formatDate(invoice.dueDate)}`}
                    </span>
                    <Badge className={INVOICE_STATUS_BADGE_CLASSES[invoice.status]}>
                      {INVOICE_STATUS_LABELS[invoice.status]}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
