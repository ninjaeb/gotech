"use client";

import { useState, useTransition } from "react";
import { changeContactLifecycleStage } from "@/app/actions/contacts";
import { Select } from "@/components/ui/field";
import { LIFECYCLE_STAGES, LIFECYCLE_STAGE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { LifecycleStage } from "@/generated/prisma/client";

export function LifecycleStageSelect({
  contactId,
  value,
  className,
}: {
  contactId: string;
  value: LifecycleStage | null;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Select
        value={value ?? ""}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          setError(null);
          startTransition(async () => {
            const result = await changeContactLifecycleStage(contactId, next);
            if (result?.error) setError(result.error);
          });
        }}
        className={cn("w-auto", className)}
      >
        <option value="">Unset</option>
        {LIFECYCLE_STAGES.map((stage) => (
          <option key={stage} value={stage}>
            {LIFECYCLE_STAGE_LABELS[stage]}
          </option>
        ))}
      </Select>
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
