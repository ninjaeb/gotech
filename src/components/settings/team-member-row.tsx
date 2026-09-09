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
import { useToast } from "@/components/ui/toast";

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
    notifyNewWhatsAppMessage: boolean;
    notifyNewLead: boolean;
    referralCode: string | null;
  };
  isSelf: boolean;
  canDelete: boolean;
  currency: string;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const toast = useToast();

  // Imperative toast, not useActionState + useActionToast: a successful
  // delete removes this exact row from the team list on the same
  // revalidation that carries the result, unmounting this component before
  // a state-driven effect would ever get to render it.
  function handleDelete() {
    startDeleteTransition(async () => {
      try {
        const result = await deleteUser(user.id);
        if (result && "error" in result) {
          toast.error(result.error);
        } else {
          toast.success("Login removed.");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't remove login.");
      }
    });
  }

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
                toast.success("Details saved.");
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
            {/* WhatsApp number + broadcast opt-ins are internal-staff features
            (task-reminder, @mention, new-message/new-lead pings) — a Partner
            has no tasks, mentions, or CRM inbox to be notified about, and
            the two checkboxes below only ever fire for role ADMIN anyway
            (see notifyNewWhatsAppMessageViaWhatsApp/notifyNewLeadViaWhatsApp
            in src/lib/whatsapp.ts), so neither is shown for that role. */}
            {user.role !== "PARTNER" && (
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
                  {PHONE_FORMAT_HINT} Used for the daily task-reminder and @mention notifications over WhatsApp. Leave
                  blank to opt out of both.
                </p>
              </div>
            )}
          </div>

          {user.role !== "PARTNER" && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  name="notifyNewWhatsAppMessage"
                  defaultChecked={user.notifyNewWhatsAppMessage}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-neutral-700"
                />
                Notify me of new WhatsApp messages
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  name="notifyNewLead"
                  defaultChecked={user.notifyNewLead}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-neutral-700"
                />
                Notify me of new leads
              </label>
              <p className="text-xs text-slate-400">Both only take effect once a WhatsApp number is set above.</p>
            </div>
          )}

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
    <li className="flex flex-col gap-2 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-800 dark:text-slate-200">
          {user.name}
          {isSelf && <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>}
        </p>
        <p className="truncate text-xs text-slate-400">
          {user.email}
          {user.title && ` · ${user.title}`} · joined {formatDate(user.createdAt)}
          {user.role !== "PARTNER" && user.phone && ` · WhatsApp notifications on`}
          {user.role === "PARTNER" && user.referralCode && ` · referral link /r/${user.referralCode}`}
        </p>
      </div>
      {/* flex-wrap (not a single non-wrapping row) so every control below
      gets its own line on a narrow phone instead of running off-screen —
      each is a direct child of this wrapper, not nested in its own
      non-wrapping group, so they wrap independently rather than as a stuck-
      together cluster. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setEditing(true);
          }}
          className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
          title="Edit name, email, title, and WhatsApp number"
        >
          Edit
          <Pencil className="h-3 w-3" />
        </button>
        <UserRateEditor userId={user.id} hourlyRate={user.hourlyRate} currency={currency} />
        {!isSelf && (
          <>
            <UserRoleSelect userId={user.id} role={user.role} />
            <ResetPasswordButton userId={user.id} userName={user.name} />
            {canDelete && (
              <form action={handleDelete}>
                <ConfirmSubmitButton
                  confirmMessage={`Remove ${user.name}'s login? They won't be able to sign in anymore.`}
                  size="sm"
                  disabled={deletePending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </ConfirmSubmitButton>
              </form>
            )}
          </>
        )}
      </div>
    </li>
  );
}
