"use client";

import { useTransition } from "react";
import { updateDirectoryLeadStatus } from "@/app/actions/directory";
import type { DirectoryLeadStatus } from "@/generated/prisma/client";
import { Select } from "@/components/ui/field";
import { DIRECTORY_LEAD_STATUSES, DIRECTORY_LEAD_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function DirectoryLeadStatusSelect({
  leadId,
  status,
  className,
}: {
  leadId: string;
  status: DirectoryLeadStatus;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onChange={(event) => {
        const formData = new FormData();
        formData.set("status", event.target.value);
        startTransition(() => updateDirectoryLeadStatus(leadId, formData));
      }}
      className={cn("w-auto", className)}
    >
      {DIRECTORY_LEAD_STATUSES.map((option) => (
        <option key={option} value={option}>
          {DIRECTORY_LEAD_STATUS_LABELS[option]}
        </option>
      ))}
    </Select>
  );
}
