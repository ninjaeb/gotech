"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateUserRate } from "@/app/actions/users";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/ui/toast";

export function UserRateEditor({
  userId,
  hourlyRate,
  currency,
}: {
  userId: string;
  hourlyRate: number | null;
  currency: string;
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
              await updateUserRate(userId, formData);
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
          step="0.01"
          defaultValue={hourlyRate ?? ""}
          placeholder="0.00"
          className="h-7 w-20 px-2 text-xs"
        />
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
      title="Set hourly billing rate"
    >
      {hourlyRate !== null ? `${formatCurrency(hourlyRate, currency)}/hr` : "No rate set"}
      <Pencil className="h-3 w-3" />
    </button>
  );
}
