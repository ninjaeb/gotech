"use client";

import { useActionState } from "react";
import { updateDirectoryApprovalMode } from "@/app/actions/directory";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";
import { useActionToast } from "@/components/ui/toast";
import type { DirectoryApprovalMode } from "@/generated/prisma/client";

const APPROVAL_MODE_OPTIONS: { value: DirectoryApprovalMode; label: string; description: string }[] = [
  {
    value: "EVERY_SUBMISSION",
    label: "Submission and changes approval",
    description: "Every submitted listing, and every later change to an already-published one, needs your review first.",
  },
  {
    value: "FIRST_SUBMISSION_ONLY",
    label: "First-time submission approval",
    description: "A listing needs your review the first time it's submitted. After that, a partner's own changes go live immediately.",
  },
  {
    value: "NONE",
    label: "No approval required",
    description: "Every submission goes live immediately — nothing waits in the review queue.",
  },
];

export function DirectoryApprovalSettingsForm({ mode }: { mode: DirectoryApprovalMode }) {
  const [state, formAction, pending] = useActionState(updateDirectoryApprovalMode, undefined);
  useActionToast(state, "Saved.", { toastErrors: false });

  return (
    <form action={formAction} className="space-y-4">
      <div className="max-w-sm">
        <Label htmlFor="mode">When a listing goes live</Label>
        <Select id="mode" name="mode" defaultValue={mode}>
          {APPROVAL_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <ul className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        {APPROVAL_MODE_OPTIONS.map((option) => (
          <li key={option.value}>
            <strong className="text-slate-700 dark:text-slate-300">{option.label}</strong> — {option.description}
          </li>
        ))}
      </ul>
      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
