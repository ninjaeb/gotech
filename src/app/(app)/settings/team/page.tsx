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

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Team" }]}
        title="Team"
        description="Logins, roles, billing rates, and WhatsApp task-reminder numbers"
      />
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
            {users.map((user) => (
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
                }}
                isSelf={user.id === currentUser.id}
                canDelete={users.length > 1}
                currency={currency}
              />
            ))}
          </ul>

          <CreateUserForm />
        </CardBody>
      </Card>
    </div>
  );
}
