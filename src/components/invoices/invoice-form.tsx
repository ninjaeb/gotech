"use client";

import { useActionState } from "react";
import type { InvoiceFormState } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { INVOICE_STATUSES, INVOICE_STATUS_LABELS } from "@/lib/labels";
import { formatDateInput } from "@/lib/format";

type InvoiceDraft = {
  title: string;
  amount: number;
  status: string;
  dueDate: Date | null;
  notes: string | null;
};

export function InvoiceForm({
  action,
  invoice,
  submitLabel = "Save invoice",
}: {
  action: (prevState: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
  invoice?: InvoiceDraft;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <FieldGroup label="Title" htmlFor="title" required>
        <Input id="title" name="title" required defaultValue={invoice?.title} placeholder="Deposit invoice" />
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Amount" htmlFor="amount" required>
          <Input
            id="amount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={invoice?.amount}
          />
        </FieldGroup>
        <FieldGroup label="Due date" htmlFor="dueDate">
          <DatePicker id="dueDate" name="dueDate" defaultValue={formatDateInput(invoice?.dueDate)} />
        </FieldGroup>
      </div>

      <FieldGroup label="Status" htmlFor="status">
        <Select id="status" name="status" defaultValue={invoice?.status ?? "DRAFT"} className="w-auto">
          {INVOICE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {INVOICE_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </FieldGroup>

      <FieldGroup label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={3} defaultValue={invoice?.notes ?? ""} />
      </FieldGroup>

      {state?.error && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
