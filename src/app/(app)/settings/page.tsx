import { Trash2 } from "lucide-react";
import { updateCurrency } from "@/app/actions/settings";
import { deleteUser } from "@/app/actions/users";
import { getCurrency } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { CURRENCIES } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { CreateUserForm } from "@/components/settings/create-user-form";
import { ResetPasswordButton } from "@/components/settings/reset-password-button";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export default async function SettingsPage() {
  const [currency, currentUser, users] = await Promise.all([
    getCurrency(),
    getCurrentUser(),
    db.user.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="Settings" description="CRM-wide preferences" />

      <Card>
        <CardHeader>
          <CardTitle>Currency</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={updateCurrency} className="space-y-4">
            <div>
              <Label htmlFor="currency">
                Used for every deal value across the CRM (dashboard, pipeline, AI summaries)
              </Label>
              <Select id="currency" name="currency" defaultValue={currency}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardBody>
      </Card>

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
                {user.id !== currentUser.id && (
                  <div className="flex items-center gap-2">
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
              </li>
            ))}
          </ul>

          <CreateUserForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change your password</CardTitle>
        </CardHeader>
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}
