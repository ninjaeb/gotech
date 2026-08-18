"use client";

import { useState, useTransition } from "react";
import { changeDealStage } from "@/app/actions/deals";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function DealStageSelect({
  dealId,
  pipelineStageId,
  stages,
  className,
}: {
  dealId: string;
  pipelineStageId: string;
  stages: { id: string; name: string }[];
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Select
        value={pipelineStageId}
        disabled={pending}
        onChange={(event) => {
          const value = event.target.value;
          setError(null);
          startTransition(async () => {
            const result = await changeDealStage(dealId, value);
            if (result?.error) setError(result.error);
          });
        }}
        className={cn("w-auto", className)}
      >
        {stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.name}
          </option>
        ))}
      </Select>
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
