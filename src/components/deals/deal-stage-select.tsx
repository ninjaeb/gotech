"use client";

import { useTransition } from "react";
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

  return (
    <Select
      value={stage}
      disabled={pending}
      onChange={(event) => {
        const value = event.target.value as DealStage;
        startTransition(() => {
          void changeDealStage(dealId, value);
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
  );
}
