import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { deleteContact } from "@/app/actions/contacts";
import { inviteToPortal, revokePortalAccess } from "@/app/actions/client-portal";
import { enrollContact, stopEnrollment } from "@/app/actions/sequence-enrollments";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { ActivityForm } from "@/components/activity/activity-form";
import { WhatsAppLink, MailLink } from "@/components/ui/channel-links";
import { TaskList } from "@/components/tasks/task-list";
import { TaskQuickForm } from "@/components/tasks/task-quick-form";
import { AiInsightsPanel } from "@/components/ai/ai-insights-panel";
import { SectionBoard } from "@/components/layout/section-board";
import { Linkify } from "@/components/ui/linkify";
import { ContactAvatarZoom } from "@/components/contacts/contact-avatar-zoom";
import { SendEmailButton } from "@/components/contacts/send-email-button";
import { ENROLLMENT_STATUS_BADGE_CLASSES, ENROLLMENT_STATUS_LABELS, stageBadgeClasses } from "@/lib/labels";
import { formatCurrency, formatDate, formatMinutes, fullName } from "@/lib/format";
import { getCurrency } from "@/lib/settings";
import { getActiveSequences } from "@/lib/sequences";
import { requireAdmin } from "@/lib/auth/dal";
import { getSiteOrigin } from "@/lib/site-url";
import { readSectionLayout } from "@/lib/section-layout";

const DEFAULT_LAYOUT = {
  main: ["deals"],
  sidebar: ["aiAssistant", "tasks", "activity", "sequences", "clientPortal"],
};

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const currentUser = await requireAdmin();
  const [currency, contact, hasEmailAccount, timeLogged, siteOrigin, activeSequences, users] = await Promise.all([
    getCurrency(),
    db.contact.findUnique({
      where: { id },
      include: {
        company: true,
        deals: { orderBy: { createdAt: "desc" }, include: { pipelineStage: true } },
        tasks: {
          orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { priority: "desc" }],
          include: {
            assignees: { include: { user: { select: { id: true, name: true } } } },
            _count: { select: { followers: true } },
          },
        },
        activities: { orderBy: { createdAt: "desc" }, take: 30 },
        clientUser: { select: { passwordHash: true, inviteToken: true } },
        sequenceEnrollments: {
          orderBy: { enrolledAt: "desc" },
          include: { sequence: { select: { id: true, name: true } } },
        },
      },
    }),
    db.emailAccount.findUnique({ where: { userId: currentUser.id }, select: { id: true } }).then(Boolean),
    db.timeEntry.aggregate({ where: { task: { contactId: id } }, _sum: { minutes: true } }),
    getSiteOrigin(),
    getActiveSequences(),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!contact) notFound();
  const totalMinutes = timeLogged._sum.minutes ?? 0;
  const layout = readSectionLayout(currentUser.sectionLayout, "contact", DEFAULT_LAYOUT);

  const contactName = fullName(contact.firstName, contact.lastName);

  return (
    <div>
      <PageHeader
        title={contactName}
        description={
          [contact.title, contact.company?.name].filter(Boolean).join(" at ") ||
          undefined
        }
        actions={
          <>
            <Link
              href={`/contacts/${contact.id}/edit`}
              className={buttonClasses("secondary")}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <form action={deleteContact.bind(null, contact.id)}>
              <ConfirmSubmitButton confirmMessage="Delete this contact?">
                <Trash2 className="h-4 w-4" />
                Delete
              </ConfirmSubmitButton>
            </form>
          </>
        }
      />

      <SectionBoard
        pageType="contact"
        initialLayout={layout}
        pinnedMain={
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex items-center gap-4 pb-4">
                <ContactAvatarZoom
                  photoUrl={contact.photoUrl}
                  name={contactName}
                  className="h-24 w-24 text-2xl"
                />
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {contactName}
                  </p>
                  {contact.company && (
                    <Link
                      href={`/companies/${contact.company.id}`}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      {contact.company.name}
                    </Link>
                  )}
                </div>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <DetailRow
                  label="Email"
                  value={
                    contact.email && (
                      <span className="inline-flex items-center gap-1.5">
                        {contact.email}
                        <MailLink email={contact.email} />
                        {hasEmailAccount && (
                          <SendEmailButton contactId={contact.id} contactName={contactName} />
                        )}
                      </span>
                    )
                  }
                />
                <DetailRow
                  label="Phone"
                  value={
                    contact.phone && (
                      <span className="inline-flex items-center gap-1.5">
                        {contact.phone}
                        <WhatsAppLink phone={contact.phone} />
                      </span>
                    )
                  }
                />
                <DetailRow label="Title" value={contact.title} />
              </div>
              {contact.notes && (
                <div className="mt-3 text-sm">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Notes
                  </p>
                  <Linkify text={contact.notes} className="mt-1 text-slate-700 dark:text-slate-300" />
                </div>
              )}
            </CardBody>
          </Card>
        }
        sections={{
          aiAssistant: <AiInsightsPanel entity={{ contactId: contact.id }} />,
          deals: (
            <Card>
              <CardHeader>
                <CardTitle>Deals ({contact.deals.length})</CardTitle>
                <Link
                  href={`/deals/new?contactId=${contact.id}`}
                  className={buttonClasses("secondary", "sm")}
                >
                  <Plus className="h-4 w-4" />
                  Add deal
                </Link>
              </CardHeader>
              <CardBody>
                {contact.deals.length === 0 ? (
                  <EmptyState title="No deals linked to this contact yet." />
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                    {contact.deals.map((deal) => (
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
                <TaskList tasks={contact.tasks} users={users} emptyMessage="No tasks yet." />
                <TaskQuickForm contactId={contact.id} users={users} defaultAssigneeId={currentUser.id} />
              </CardBody>
            </Card>
          ),
          activity: (
            <Card>
              <CardHeader>
                <CardTitle>Activity</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <ActivityForm contactId={contact.id} users={users} />
                <ActivityFeed activities={contact.activities} users={users} />
              </CardBody>
            </Card>
          ),
          sequences: (
            <Card>
              <CardHeader>
                <CardTitle>Sequences</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3 text-sm">
                {contact.sequenceEnrollments.length > 0 && (
                  <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                    {contact.sequenceEnrollments.map((enrollment) => (
                      <li key={enrollment.id} className="flex items-center justify-between gap-2 py-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800 dark:text-slate-200">
                            {enrollment.sequence.name}
                          </p>
                          {enrollment.status === "ACTIVE" && (
                            <p className="text-xs text-slate-400">
                              Next email {formatDate(enrollment.nextStepDueAt)}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge className={ENROLLMENT_STATUS_BADGE_CLASSES[enrollment.status]}>
                            {ENROLLMENT_STATUS_LABELS[enrollment.status]}
                          </Badge>
                          {enrollment.status === "ACTIVE" && (
                            <form action={stopEnrollment.bind(null, enrollment.id)}>
                              <ConfirmSubmitButton
                                confirmMessage="Stop this sequence for this contact?"
                                size="sm"
                              >
                                Stop
                              </ConfirmSubmitButton>
                            </form>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {hasEmailAccount && contact.email && activeSequences.length > 0 ? (
                  <form
                    action={enrollContact.bind(null, contact.id)}
                    className="flex items-end gap-2 border-t border-slate-100 pt-3 dark:border-neutral-800"
                  >
                    <Select name="sequenceId" required defaultValue="" className="flex-1">
                      <option value="" disabled>
                        Enroll in…
                      </option>
                      {activeSequences
                        .filter(
                          (s) =>
                            !contact.sequenceEnrollments.some(
                              (e) => e.sequenceId === s.id && e.status === "ACTIVE",
                            ),
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </Select>
                    <Button type="submit" size="sm">
                      Enroll
                    </Button>
                  </form>
                ) : (
                  contact.sequenceEnrollments.length === 0 && (
                    <p className="text-slate-500 dark:text-slate-400">
                      {!contact.email
                        ? "Add an email address to enroll this contact in a sequence."
                        : !hasEmailAccount
                          ? "Connect your email in Settings to enroll contacts in sequences."
                          : "No active sequences — create one in Settings."}
                    </p>
                  )
                )}
              </CardBody>
            </Card>
          ),
          clientPortal: (
            <Card>
              <CardHeader>
                <CardTitle>Client portal</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3 text-sm">
                {contact.clientUser ? (
                  <>
                    {contact.clientUser.passwordHash ? (
                      <p className="text-emerald-600 dark:text-emerald-400">Portal access is active.</p>
                    ) : (
                      <>
                        <p className="text-slate-600 dark:text-slate-400">
                          Invited — share this link so they can set a password:
                        </p>
                        <CopyLinkButton
                          text={`${siteOrigin}/portal/accept-invite/${contact.clientUser.inviteToken}`}
                        />
                      </>
                    )}
                    <form action={revokePortalAccess.bind(null, contact.id)}>
                      <ConfirmSubmitButton
                        confirmMessage="Revoke this contact's portal access? They'll be signed out immediately."
                        size="sm"
                      >
                        Revoke access
                      </ConfirmSubmitButton>
                    </form>
                  </>
                ) : contact.email && contact.company ? (
                  <form action={inviteToPortal.bind(null, contact.id)}>
                    <Button type="submit" variant="secondary" size="sm">
                      Invite to portal
                    </Button>
                  </form>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400">
                    Add an email and link a company to invite this contact to the portal.
                  </p>
                )}
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
