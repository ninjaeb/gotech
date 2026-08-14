"use client";

import { useTransition } from "react";
import { updateProjectStatus } from "@/app/actions/projects";
import type { ProjectStatus } from "@/generated/prisma/client";
import { Select } from "@/components/ui/field";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function ProjectStatusSelect({
  projectId,
  status,
  className,
}: {
  projectId: string;
  status: ProjectStatus;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onChange={(event) => {
        const value = event.target.value as ProjectStatus;
        startTransition(() => {
          void updateProjectStatus(projectId, value);
        });
      }}
      className={cn("w-auto", className)}
    >
      {PROJECT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {PROJECT_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}
