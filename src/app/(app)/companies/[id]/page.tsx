import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteCompany } from "@/app/actions/companies";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { ActivityForm } from "@/components/activity/activity-form";
import { TaskList } from "@/components/tasks/task-list";
import { TaskQuickForm } from "@/components/tasks/task-quick-form";
import { LinkContactForm } from "@/components/contacts/link-contact-form";
import { AiInsightsPanel } from "@/components/ai/ai-insights-panel";
import { SectionBoard } from "@/components/layout/section-board";
import { Linkify } from "@/components/ui/linkify";
import { WhatsAppLink } from "@/components/ui/channel-links";
import { stageBadgeClasses } from "@/lib/labels";
import { formatCurrency, formatMinutes, fullName } from "@/lib/format";
import { getCurrency } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/dal";
import { readSectionLayout } from "@/lib/section-layout";

const DEFAULT_LAYOUT = { main: ["contacts", "deals"], sidebar: ["aiAssistant", "tasks", "activity"] };

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  const [currency, company, allContacts, timeLogged, users] = await Promise.all([
    getCurrency(),
    db.company.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: { firstName: "asc" } },
        deals: { orderBy: { createdAt: "desc" }, include: { pipelineStage: true } },
        tasks: {
          orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { priority: "desc" }],
          include: {
            assignees: { include: { user: { select: { id: true, name: true } } } },
            _count: { select: { followers: true } },
          },
        },
        activities: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    }),
    db.contact.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyId: true,
        company: { select: { name: true } },
      },
    }),
    db.timeEntry.aggregate({ where: { task: { companyId: id } }, _sum: { minutes: true } }),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!company) notFound();
  const totalMinutes = timeLogged._sum.minutes ?? 0;
  const layout = readSectionLayout(currentUser.sectionLayout, "company", DEFAULT_LAYOUT);

  const linkableContacts = allContacts.filter((contact) => contact.companyId !== id);

  return (
    <div>
      <PageHeader
        title={company.name}
        description={[company.industry, company.domain].filter(Boolean).join(" · ")}
        actions={
          <>
            <Link
              href={`/companies/${company.id}/edit`}
              className={buttonClasses("secondary")}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <form action={deleteCompany.bind(null, company.id)}>
              <ConfirmSubmitButton confirmMessage="Delete this company? Contacts and deals will be unlinked.">
                <Trash2 className="h-4 w-4" />
                Delete
              </ConfirmSubmitButton>
            </form>
          </>
        }
      />

      <SectionBoard
        pageType="company"
        initialLayout={layout}
        pinnedMain={
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
              <DetailRow label="Domain" value={company.domain} />
              <DetailRow label="Industry" value={company.industry} />
              <DetailRow
                label="Phone"
                value={
                  company.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      {company.phone}
                      <WhatsAppLink phone={company.phone} />
                    </span>
                  )
                }
              />
              <DetailRow label="Address" value={company.address} />
              {company.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Notes
                  </p>
                  <Linkify text={company.notes} className="mt-1 text-slate-700 dark:text-slate-300" />
                </div>
              )}
            </CardBody>
          </Card>
        }
        sections={{
          aiAssistant: <AiInsightsPanel entity={{ companyId: company.id }} />,
          contacts: (
            <Card>
              <CardHeader>
                <CardTitle>Contacts ({company.contacts.length})</CardTitle>
                <Link
                  href={`/contacts/new?companyId=${company.id}`}
                  className={buttonClasses("secondary", "sm")}
                >
                  <Plus className="h-4 w-4" />
                  Add contact
                </Link>
              </CardHeader>
              <CardBody className="space-y-3">
                {company.contacts.length === 0 ? (
                  <EmptyState title="No contacts linked to this company yet." />
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                    {company.contacts.map((contact) => (
                      <li key={contact.id}>
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="flex items-center justify-between py-2.5 text-sm hover:text-indigo-600"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {fullName(contact.firstName, contact.lastName)}
                          </span>
                          <span className="text-slate-400">{contact.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <LinkContactForm companyId={company.id} contacts={linkableContacts} />
              </CardBody>
            </Card>
          ),
          deals: (
            <Card>
              <CardHeader>
                <CardTitle>Deals ({company.deals.length})</CardTitle>
                <Link
                  href={`/deals/new?companyId=${company.id}`}
                  className={buttonClasses("secondary", "sm")}
                >
                  <Plus className="h-4 w-4" />
                  Add deal
                </Link>
              </CardHeader>
              <CardBody>
                {company.deals.length === 0 ? (
                  <EmptyState title="No deals linked to this company yet." />
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                    {company.deals.map((deal) => (
                      <li key={deal.id}>
                        <Link
                          href={`/deals/${deal.id}`}
                          className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-indigo-600"
                        >
                          <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-200">
                            {deal.title}
                          </span>
                          <span className="flex shrink-0 items-center gap-3">
                            <span className="text-slate-500 dark:text-slate-400">
                              {formatCurrency(deal.value.toString(), currency)}
                            </span>
                            <Badge className={stageBadgeClasses(deal.pipelineStage)}>
                              {deal.pipelineStage.name}
                            </Badge>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          ),
          tasks: (
            <Card>
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
                {totalMinutes > 0 && <Badge>{formatMinutes(totalMinutes)} logged</Badge>}
              </CardHeader>
              <CardBody>
                <TaskList tasks={company.tasks} users={users} emptyMessage="No tasks yet." />
                <TaskQuickForm companyId={company.id} users={users} defaultAssigneeId={currentUser.id} />
              </CardBody>
            </Card>
          ),
          activity: (
            <Card>
              <CardHeader>
                <CardTitle>Activity</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <ActivityForm companyId={company.id} users={users} />
                <ActivityFeed activities={company.activities} users={users} />
              </CardBody>
            </Card>
          ),
        }}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-slate-800 dark:text-slate-200">{value || "—"}</p>
    </div>
  );
}
