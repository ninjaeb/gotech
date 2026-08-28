"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteUser, updateUserDetails } from "@/app/actions/users";
import type { Role } from "@/generated/prisma/client";
import { Label, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { PHONE_FORMAT_HINT } from "@/lib/phone";
import { formatDate } from "@/lib/format";
import { UserRateEditor } from "@/components/settings/user-rate-editor";
import { UserRoleSelect } from "@/components/settings/user-role-select";
import { ResetPasswordButton } from "@/components/settings/reset-password-button";

export function TeamMemberRow({
  user,
  isSelf,
  canDelete,
  currency,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    title: string | null;
    phone: string | null;
    role: Role;
    hourlyRate: number | null;
    createdAt: Date;
  };
  isSelf: boolean;
  canDelete: boolean;
  currency: string;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <li className="py-2.5 text-sm">
        <form
          action={(formData) => {
            startTransition(async () => {
              const result = await updateUserDetails(user.id, undefined, formData);
              if (result && "error" in result) {
                setError(result.error);
              } else {
                setError(null);
                setEditing(false);
              }
            });
          }}
          className="space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`name-${user.id}`}>Name</Label>
              <Input id={`name-${user.id}`} name="name" defaultValue={user.name} required />
            </div>
            <div>
              <Label htmlFor={`email-${user.id}`}>Email</Label>
              <Input id={`email-${user.id}`} name="email" type="email" defaultValue={user.email} required />
            </div>
            <div>
              <Label htmlFor={`title-${user.id}`}>Title</Label>
              <Input id={`title-${user.id}`} name="title" defaultValue={user.title ?? ""} />
            </div>
            <div>
              <Label htmlFor={`phone-${user.id}`}>WhatsApp number</Label>
              <Input
                id={`phone-${user.id}`}
                name="phone"
                type="tel"
                defaultValue={user.phone ?? ""}
                placeholder="+60 12 345 6789"
              />
              <p className="mt-1 text-xs text-slate-400">
                {PHONE_FORMAT_HINT} Used only for the daily task-reminder opt-in. Leave blank to opt out.
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setError(null);
                setEditing(false);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-800 dark:text-slate-200">
          {user.name}
          {isSelf && <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>}
        </p>
        <p className="truncate text-xs text-slate-400">
          {user.email}
          {user.title && ` · ${user.title}`} · joined {formatDate(user.createdAt)}
          {user.phone && ` · WhatsApp reminders on`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setEditing(true);
          }}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          title="Edit name, email, title, and WhatsApp number"
        >
          Edit
          <Pencil className="h-3 w-3" />
        </button>
        <UserRateEditor userId={user.id} hourlyRate={user.hourlyRate} currency={currency} />
        {!isSelf && (
          <div className="flex items-center gap-2">
            <UserRoleSelect userId={user.id} role={user.role} />
            <ResetPasswordButton userId={user.id} userName={user.name} />
            {canDelete && (
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
  );
}
