"use client";

import { useTransition } from "react";
import { changeInvoiceStatus } from "@/app/actions/invoices";
import type { InvoiceStatus } from "@/generated/prisma/client";
import { Select } from "@/components/ui/field";
import { INVOICE_STATUSES, INVOICE_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function InvoiceStatusSelect({
  invoiceId,
  status,
  className,
}: {
  invoiceId: string;
  status: InvoiceStatus;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onChange={(event) => {
        const value = event.target.value as InvoiceStatus;
        startTransition(() => {
          void changeInvoiceStatus(invoiceId, value);
        });
      }}
      className={cn("w-auto", className)}
    >
      {INVOICE_STATUSES.map((s) => (
        <option key={s} value={s}>
          {INVOICE_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}
