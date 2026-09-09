import { getCurrentUser, requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getCurrency } from "@/lib/settings";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateUserForm } from "@/components/settings/create-user-form";
import { TeamMemberRow } from "@/components/settings/team-member-row";

export default async function TeamSettingsPage() {
  await requireAdmin();
  const currentUser = await getCurrentUser();
  const [users, currency] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" } }),
    getCurrency(),
  ]);

  // Partners have their own portal and never touch the CRM proper — kept as
  // a visually separate section from the Admin/Sales/Technical logins that
  // actually sign into this app, rather than one flat list mixing both.
  const systemUsers = users.filter((user) => user.role !== "PARTNER");
  const partners = users.filter((user) => user.role === "PARTNER");

  function userRow(user: (typeof users)[number]) {
    return (
      <TeamMemberRow
        key={user.id}
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          title: user.title,
          phone: user.phone,
          role: user.role,
          hourlyRate: user.hourlyRate === null ? null : Number(user.hourlyRate),
          createdAt: user.createdAt,
          notifyNewWhatsAppMessage: user.notifyNewWhatsAppMessage,
          notifyNewLead: user.notifyNewLead,
          referralCode: user.referralCode,
        }}
        isSelf={user.id === currentUser.id}
        canDelete={users.length > 1}
        currency={currency}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Settings", href: "/system/settings" }, { label: "Team" }]}
        title="Team"
        description="Logins, roles, billing rates, and WhatsApp task-reminder numbers"
      />
      <Card>
        <CardHeader>
          <CardTitle>System logins</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="divide-y divide-slate-100 dark:divide-neutral-800">{systemUsers.map(userRow)}</ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Partners</CardTitle>
        </CardHeader>
        <CardBody>
          {partners.length > 0 ? (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">{partners.map(userRow)}</ul>
          ) : (
            <p className="text-sm text-slate-400">No partner logins yet.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add a login</CardTitle>
        </CardHeader>
        <CardBody>
          <CreateUserForm />
        </CardBody>
      </Card>
    </div>
  );
}
