import { Trash2 } from "lucide-react";
import { deleteUser } from "@/app/actions/users";
import { getCurrentUser, requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getCurrency } from "@/lib/settings";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { CreateUserForm } from "@/components/settings/create-user-form";
import { UserRateEditor } from "@/components/settings/user-rate-editor";
import { UserRoleSelect } from "@/components/settings/user-role-select";
import { ResetPasswordButton } from "@/components/settings/reset-password-button";

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
        description="Logins, roles, and billing rates"
      />
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
            {users.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800 dark:text-slate-200">
                    {user.name}
                    {user.id === currentUser.id && (
                      <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {user.email}
                    {user.title && ` · ${user.title}`} · joined {formatDate(user.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <UserRateEditor
                    userId={user.id}
                    hourlyRate={user.hourlyRate === null ? null : Number(user.hourlyRate)}
                    currency={currency}
                  />
                  {user.id !== currentUser.id && (
                    <div className="flex items-center gap-2">
                      <UserRoleSelect userId={user.id} role={user.role} />
                      <ResetPasswordButton userId={user.id} userName={user.name} />
                      {users.length > 1 && (
                        <form action={deleteUser.bind(null, user.id)}>
                          <ConfirmSubmitButton
                            confirmMessage={`Remove ${user.name}'s login? They won't be able to sign in anymore.`}
                            size="sm"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </ConfirmSubmitButton>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <CreateUserForm />
        </CardBody>
      </Card>
    </div>
  );
}
