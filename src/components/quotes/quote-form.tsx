"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";
import { formatCurrency } from "@/lib/format";
import { lineItemTotal, quoteTotal } from "@/lib/quotes";
import { cn } from "@/lib/utils";
import type { QuoteFormState } from "@/app/actions/quotes";

// Plain-number shapes, not the Prisma-generated types — those carry Decimal
// fields, and Decimal instances can't cross the Server → Client Component
// boundary (React can only pass plain serializable objects as props).
// Callers convert with Number(...) before passing these in.
type ServicePackageOption = { id: string; name: string; description: string | null; unitPrice: number };
type QuoteItemDraft = { description: string; quantity: number; unitPrice: number; servicePackageId: string | null };
type QuoteDraft = { title: string; notes: string | null; items: QuoteItemDraft[] };
type QuoteTemplateOption = { id: string; name: string; notes: string | null; items: QuoteItemDraft[] };

type ItemDraft = {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
  servicePackageId: string;
};

let draftKeySeq = 0;
function newDraftKey() {
  draftKeySeq += 1;
  return `draft-${draftKeySeq}`;
}

function blankItem(): ItemDraft {
  return { key: newDraftKey(), description: "", quantity: "1", unitPrice: "0", servicePackageId: "" };
}

function draftsFromItems(items: QuoteItemDraft[]): ItemDraft[] {
  return items.length > 0
    ? items.map((item) => ({
        key: newDraftKey(),
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        servicePackageId: item.servicePackageId ?? "",
      }))
    : [blankItem()];
}

export function QuoteForm({
  action,
  quote,
  servicePackages,
  quoteTemplates,
  currency = "USD",
  submitLabel = "Save quote",
  titleLabel = "Title",
  titlePlaceholder = "Website redesign — Proposal",
  notesLabel = "Notes / terms (optional)",
}: {
  action: (prevState: QuoteFormState, formData: FormData) => Promise<QuoteFormState> | QuoteFormState;
  quote?: QuoteDraft;
  servicePackages: ServicePackageOption[];
  // Only meaningful on a fresh, empty form (e.g. New Quote) — picking one
  // wholesale-replaces the current items/notes, which would clobber an
  // in-progress edit, so callers editing an existing record leave this unset.
  quoteTemplates?: QuoteTemplateOption[];
  currency?: string;
  submitLabel?: string;
  titleLabel?: string;
  titlePlaceholder?: string;
  notesLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [items, setItems] = useState<ItemDraft[]>(() => (quote ? draftsFromItems(quote.items) : [blankItem()]));
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [templateSelection, setTemplateSelection] = useState("");

  function updateItem(key: string, patch: Partial<ItemDraft>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function handlePackageChange(key: string, servicePackageId: string) {
    const pkg = servicePackages.find((p) => p.id === servicePackageId);
    updateItem(key, {
      servicePackageId,
      ...(pkg
        ? {
            description: pkg.description ? `${pkg.name} — ${pkg.description}` : pkg.name,
            unitPrice: pkg.unitPrice.toString(),
          }
        : {}),
    });
  }

  function applyTemplate(templateId: string) {
    const template = quoteTemplates?.find((t) => t.id === templateId);
    if (!template) return;
    setItems(draftsFromItems(template.items));
    setNotes(template.notes ?? "");
    // Reset back to the placeholder — this is a one-shot "apply" action, not
    // a field whose value should keep pointing at the template afterward.
    setTemplateSelection("");
  }

  function removeItem(key: string) {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.key !== key) : current));
  }

  const total = quoteTotal(items.map((item) => ({ quantity: item.quantity || "0", unitPrice: item.unitPrice || "0" })));
  const itemsJson = JSON.stringify(
    items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      servicePackageId: item.servicePackageId || null,
    })),
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="itemsJson" value={itemsJson} />

      <FieldGroup label={titleLabel} htmlFor="quote-title" required>
        <Input id="quote-title" name="title" defaultValue={quote?.title} required placeholder={titlePlaceholder} />
      </FieldGroup>

      {quoteTemplates && quoteTemplates.length > 0 && (
        <FieldGroup label="Start from a template (optional)" htmlFor="quote-template">
          <Select
            id="quote-template"
            value={templateSelection}
            onChange={(e) => applyTemplate(e.target.value)}
          >
            <option value="">Choose a template…</option>
            {quoteTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </Select>
        </FieldGroup>
      )}

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">Line items</p>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.key} className="rounded-md border border-slate-200 p-2.5 dark:border-neutral-800">
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1.1fr_1.4fr_4.5rem_6rem_auto]">
                <Select
                  value={item.servicePackageId}
                  onChange={(e) => handlePackageChange(item.key, e.target.value)}
                  aria-label="Service or package"
                >
                  <option value="">Custom line item</option>
                  {servicePackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </option>
                  ))}
                </Select>
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(item.key, { description: e.target.value })}
                  placeholder="Description"
                  aria-label="Line item description"
                />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                  placeholder="Qty"
                  aria-label="Quantity"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(item.key, { unitPrice: e.target.value })}
                  placeholder="Unit price"
                  aria-label="Unit price"
                />
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  disabled={items.length === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-950"
                  aria-label="Remove line item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-right text-xs text-slate-400">
                {formatCurrency(lineItemTotal({ quantity: item.quantity || "0", unitPrice: item.unitPrice || "0" }), currency)}
              </p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setItems((current) => [...current, blankItem()])}
          className={cn(buttonClasses("secondary", "sm"), "mt-2")}
        >
          <Plus className="h-4 w-4" />
          Add line item
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 text-sm dark:border-neutral-800">
        <span className="font-medium text-slate-500 dark:text-slate-400">Total</span>
        <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {formatCurrency(total, currency)}
        </span>
      </div>

      <FieldGroup label={notesLabel} htmlFor="quote-notes">
        <Textarea
          id="quote-notes"
          name="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Payment terms, validity period, what's included…"
        />
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
