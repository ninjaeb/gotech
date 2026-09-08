"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updatePartnerCommissionRate } from "@/app/actions/referrals";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

// Same inline click-to-edit pattern as UserRateEditor (Settings → Team).
export function PartnerRateEditor({
  userId,
  rate,
  defaultRate,
}: {
  userId: string;
  rate: number | null;
  defaultRate: number;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (editing) {
    return (
      <form
        action={(formData) => {
          startTransition(async () => {
            try {
              await updatePartnerCommissionRate(userId, formData);
              setEditing(false);
              toast.success("Rate saved.");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Couldn't save rate.");
            }
          });
        }}
        className="flex items-center gap-1.5"
      >
        <Input
          name="rate"
          type="number"
          min="0"
          max="100"
          step="0.01"
          defaultValue={rate ?? ""}
          placeholder={`${defaultRate}`}
          className="h-7 w-20 px-2 text-xs"
        />
        <span className="text-xs text-slate-400">%</span>
        <Button type="submit" size="sm" className="!h-7 !px-2 !text-xs" disabled={pending}>
          {pending ? "…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="!h-7 !px-2 !text-xs"
          onClick={() => setEditing(false)}
          disabled={pending}
        >
          Cancel
        </Button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
      title="Set this partner's commission rate (blank = the default)"
    >
      {rate !== null ? `${rate}%` : `${defaultRate}% (default)`}
      <Pencil className="h-3 w-3" />
    </button>
  );
}
