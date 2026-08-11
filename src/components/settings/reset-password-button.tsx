"use client";

import { useActionState } from "react";
import { resetUserPassword } from "@/app/actions/users";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

export function ResetPasswordButton({ userId, userName }: { userId: string; userName: string }) {
  const [state, formAction] = useActionState(resetUserPassword.bind(null, userId), undefined);

  if (state && "success" in state) {
    return (
      <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        New password: <code className="font-mono">{state.password}</code> — shown once.
      </span>
    );
  }

  return (
    <form action={formAction}>
      <ConfirmSubmitButton
        confirmMessage={`Reset ${userName}'s password? Their current password will stop working immediately.`}
        variant="secondary"
        size="sm"
      >
        Reset password
      </ConfirmSubmitButton>
      {state && "error" in state && (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{state.error}</p>
      )}
    </form>
  );
}
