"use client";

import { useState, useTransition } from "react";
import { changeDealStage } from "@/app/actions/deals";
import type { DealStage } from "@/generated/prisma/client";
import { Select } from "@/components/ui/field";
import { DEAL_STAGES, DEAL_STAGE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function DealStageSelect({
  dealId,
  stage,
  className,
}: {
  dealId: string;
  stage: DealStage;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Select
        value={stage}
        disabled={pending}
        onChange={(event) => {
          const value = event.target.value as DealStage;
          setError(null);
          startTransition(async () => {
            const result = await changeDealStage(dealId, value);
            if (result?.error) setError(result.error);
          });
        }}
        className={cn("w-auto", className)}
      >
        {DEAL_STAGES.map((s) => (
          <option key={s} value={s}>
            {DEAL_STAGE_LABELS[s]}
          </option>
        ))}
      </Select>
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
