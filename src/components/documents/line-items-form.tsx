"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { FieldGroup, Input, Label, Select, Textarea } from "@/components/ui/field";
import { formatDocumentMoney } from "@/lib/format";
import { computeTotals, type DiscountType } from "@/lib/documents/money";
import type { CatalogComponentOption, CatalogOption, LineItemDraft, TemplateOption } from "@/lib/documents/view-model";
import { DISCOUNT_TYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

// One editor for a Quote (mode "quote": bill-to, discount, validity, Save &
// issue) and a QuoteTemplate (mode "template": just the lines). Posts the
// lines as hidden `itemsJson` in the shape src/lib/documents/schemas.ts
// parses; money stays as strings end to end so the live totals shown here
// come from the exact same computeTotals the server stores.

type FormState = { error: string } | undefined;

export type BillToDraft = { billToName: string; billToCompany: string; billToRegistrationNo: string; billToAddress: string; billToEmail: string };

export type DocumentDraft = {
  title: string;
  notes: string | null;
  items: LineItemDraft[];
  discountType?: DiscountType;
  discountValue?: string;
  billTo?: BillToDraft;
  contactId?: string | null;
  validUntil?: string; // YYYY-MM-DD
};

type ItemRow = LineItemDraft & { key: string };

let rowSeq = 0;
function newKey() {
  rowSeq += 1;
  return `row-${rowSeq}`;
}

function blankRow(taxable: boolean): ItemRow {
  return { key: newKey(), description: "", quantity: "1", unitPrice: "0", unit: null, taxable, servicePackageId: null };
}

function rowsFrom(items: LineItemDraft[], taxable: boolean): ItemRow[] {
  return items.length > 0 ? items.map((item) => ({ ...item, key: newKey() })) : [blankRow(taxable)];
}

export function LineItemsForm({
  action,
  mode,
  draft,
  catalog,
  templates,
  contacts,
  currency,
  taxLabel,
  taxRate,
  submitLabel,
  issueLabel = "Save & issue",
  titleLabel = "Title",
  titlePlaceholder = "Website redesign — Proposal",
  notesLabel = "Terms / notes (optional)",
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState> | FormState;
  mode: "quote" | "template";
  draft?: DocumentDraft;
  catalog: CatalogOption[];
  // Only on a fresh, empty form — applying one replaces the lines and notes.
  templates?: TemplateOption[];
  contacts?: { id: string; name: string }[];
  currency: string;
  taxLabel: string;
  taxRate: number; // 0 hides every tax control
  submitLabel: string;
  issueLabel?: string;
  titleLabel?: string;
  titlePlaceholder?: string;
  notesLabel?: string;
}) {
  const taxEnabled = mode === "quote" && taxRate > 0;
  const [state, formAction, pending] = useActionState(action, undefined);
  const [items, setItems] = useState<ItemRow[]>(() => rowsFrom(draft?.items ?? [], true));
  const [notes, setNotes] = useState(draft?.notes ?? "");
  const [templateSelection, setTemplateSelection] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>(draft?.discountType ?? "NONE");
  const [discountValue, setDiscountValue] = useState(draft?.discountValue && draft.discountValue !== "0.00" ? draft.discountValue : "");
  const [intent, setIntent] = useState<"save" | "issue">("save");

  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function handleCatalogChange(key: string, servicePackageId: string) {
    const pkg = catalog.find((p) => p.id === servicePackageId);
    updateItem(key, {
      servicePackageId: servicePackageId || null,
      ...(pkg
        ? {
            description: pkg.description ? `${pkg.name} — ${pkg.description}` : pkg.name,
            unitPrice: pkg.unitPrice,
            unit: pkg.unit,
            taxable: pkg.taxable,
          }
        : {}),
    });
  }

  // Swaps the one row for one real row per component, at the same position
  // — an explicit action, so a bundle quotes as one line by default.
  function expandBundleRow(key: string, components: CatalogComponentOption[]) {
    setItems((current) =>
      current.flatMap((item) =>
        item.key === key
          ? components.map((c) => ({
              key: newKey(),
              description: c.description,
              quantity: c.quantity,
              unitPrice: c.unitPrice,
              unit: c.unit,
              taxable: c.taxable,
              servicePackageId: c.servicePackageId,
            }))
          : [item],
      ),
    );
  }

  function applyTemplate(templateId: string) {
    const template = templates?.find((t) => t.id === templateId);
    if (!template) return;
    setItems(rowsFrom(template.items, true));
    setNotes(template.notes ?? "");
    setTemplateSelection("");
  }

  function removeItem(key: string) {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.key !== key) : current));
  }

  const totals = useMemo(() => {
    const safe = (v: string) => (/^\d*(\.\d{0,2})?$/.test(v) && v !== "" ? v : "0");
    const effectiveDiscount = discountType === "NONE" ? "0" : safe(discountValue);
    return computeTotals(
      items.map((item) => ({ quantity: safe(item.quantity), unitPrice: safe(item.unitPrice), taxable: taxEnabled ? item.taxable : true })),
      { discountType, discountValue: effectiveDiscount, taxRate: taxEnabled ? taxRate : 0 },
    );
  }, [items, discountType, discountValue, taxEnabled, taxRate]);

  const itemsJson = JSON.stringify(
    items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unit: item.unit || null,
      taxable: item.taxable,
      servicePackageId: item.servicePackageId || null,
    })),
  );

  const money = (value: number) => formatDocumentMoney(value, currency);
  const gridCols = "sm:grid-cols-[1fr_1.5fr_4.5rem_5.5rem_6.5rem_auto]";

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="itemsJson" value={itemsJson} />

      <div className={cn("grid gap-4", mode === "quote" && "sm:grid-cols-[1fr_12rem]")}>
        <FieldGroup label={titleLabel} htmlFor="doc-title" required>
          <Input id="doc-title" name="title" defaultValue={draft?.title} required placeholder={titlePlaceholder} />
        </FieldGroup>
        {mode === "quote" && (
          <FieldGroup label="Valid until" htmlFor="doc-valid-until">
            <Input id="doc-valid-until" name="validUntil" type="date" defaultValue={draft?.validUntil ?? ""} />
          </FieldGroup>
        )}
      </div>

      {mode === "quote" && contacts && contacts.length > 0 && (
        <FieldGroup label="Contact" htmlFor="doc-contact">
          <Select id="doc-contact" name="contactId" defaultValue={draft?.contactId ?? ""}>
            <option value="">— None —</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </Select>
        </FieldGroup>
      )}

      {templates && templates.length > 0 && (
        <FieldGroup label="Start from a template (optional)" htmlFor="doc-template">
          <Select id="doc-template" value={templateSelection} onChange={(e) => applyTemplate(e.target.value)}>
            <option value="">Choose a template…</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </Select>
        </FieldGroup>
      )}

      {mode === "quote" && (
        <fieldset className="rounded-md border border-slate-200 p-3 dark:border-neutral-800">
          <legend className="px-1 text-sm font-medium text-slate-700 dark:text-slate-300">Bill to</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="billToName">Name</Label>
              <Input id="billToName" name="billToName" defaultValue={draft?.billTo?.billToName ?? ""} placeholder="Contact person" />
            </div>
            <div>
              <Label htmlFor="billToCompany">Company</Label>
              <Input id="billToCompany" name="billToCompany" defaultValue={draft?.billTo?.billToCompany ?? ""} />
            </div>
            <div>
              <Label htmlFor="billToRegistrationNo">Registration no. (SSM)</Label>
              <Input id="billToRegistrationNo" name="billToRegistrationNo" defaultValue={draft?.billTo?.billToRegistrationNo ?? ""} />
            </div>
            <div>
              <Label htmlFor="billToEmail">Email</Label>
              <Input id="billToEmail" name="billToEmail" type="email" defaultValue={draft?.billTo?.billToEmail ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="billToAddress">Address</Label>
              <Textarea id="billToAddress" name="billToAddress" rows={2} defaultValue={draft?.billTo?.billToAddress ?? ""} />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">Left blank, these are filled from the deal&apos;s contact and company when the quote is issued.</p>
        </fieldset>
      )}

      <div>
        <div className={cn("mb-1 hidden gap-2 px-2.5 text-xs font-medium text-slate-500 sm:grid dark:text-slate-400", gridCols)}>
          <span>Catalog</span>
          <span>Description</span>
          <span>Qty</span>
          <span>Unit</span>
          <span>Unit price</span>
          <span className="w-9" />
        </div>
        <div className="space-y-2">
          {items.map((item, index) => {
            const selectedPackage = catalog.find((p) => p.id === item.servicePackageId);
            return (
              <div key={item.key} className="rounded-md border border-slate-200 p-2.5 dark:border-neutral-800">
                <div className={cn("grid grid-cols-1 items-center gap-2", gridCols)}>
                  <Select value={item.servicePackageId ?? ""} onChange={(e) => handleCatalogChange(item.key, e.target.value)} aria-label="Catalog item">
                    <option value="">Custom line item</option>
                    {catalog.map((pkg) => (
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
                    required
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                    placeholder="Qty"
                    aria-label="Quantity"
                  />
                  <Input
                    value={item.unit ?? ""}
                    onChange={(e) => updateItem(item.key, { unit: e.target.value || null })}
                    placeholder="e.g. hour"
                    aria-label="Unit"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.key, { unitPrice: e.target.value })}
                    placeholder="Unit price"
                    aria-label="Unit price"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    disabled={items.length === 1}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950 dark:hover:text-rose-300"
                    aria-label="Remove line item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {selectedPackage && selectedPackage.components.length > 0 && (
                      <button
                        type="button"
                        onClick={() => expandBundleRow(item.key, selectedPackage.components)}
                        className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Expand into {selectedPackage.components.length} line{selectedPackage.components.length === 1 ? "" : "s"}
                      </button>
                    )}
                    {taxEnabled && (
                      <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={item.taxable}
                          onChange={(e) => updateItem(item.key, { taxable: e.target.checked })}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 dark:border-neutral-700"
                        />
                        {taxLabel} applies
                      </label>
                    )}
                  </div>
                  <p className="text-right text-xs text-slate-400">{money(totals.lineTotals[index] ?? 0)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setItems((current) => [...current, blankRow(true)])}
          className={cn(buttonClasses("secondary", "sm"), "mt-2")}
        >
          <Plus className="h-4 w-4" />
          Add line item
        </button>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-start sm:justify-between dark:border-neutral-800">
        {mode === "quote" ? (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor="discountType">Discount</Label>
              <Select id="discountType" name="discountType" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} className="w-40">
                {(Object.keys(DISCOUNT_TYPE_LABELS) as DiscountType[]).map((type) => (
                  <option key={type} value={type}>
                    {DISCOUNT_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
            {discountType !== "NONE" && (
              <div>
                <Label htmlFor="discountValue">{discountType === "PERCENT" ? "Percent" : "Amount"}</Label>
                <Input
                  id="discountValue"
                  name="discountValue"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-32"
                  placeholder={discountType === "PERCENT" ? "10" : "100.00"}
                />
              </div>
            )}
          </div>
        ) : (
          <span />
        )}

        <dl className="w-full space-y-1 text-sm sm:w-64">
          {(mode === "quote" && (discountType !== "NONE" || taxEnabled)) && (
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <dt>Subtotal</dt>
              <dd>{money(totals.subtotal)}</dd>
            </div>
          )}
          {mode === "quote" && discountType !== "NONE" && (
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <dt>Discount</dt>
              <dd>− {money(totals.discountAmount)}</dd>
            </div>
          )}
          {taxEnabled && (
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <dt>
                {taxLabel} {taxRate}%
              </dt>
              <dd>{money(totals.taxAmount)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-slate-100 pt-1 dark:border-neutral-800">
            <dt className="font-medium text-slate-500 dark:text-slate-400">Total</dt>
            <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{money(totals.total)}</dd>
          </div>
        </dl>
      </div>

      <FieldGroup label={notesLabel} htmlFor="doc-notes">
        <Textarea
          id="doc-notes"
          name="notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Payment terms, what's included, delivery timeline…"
        />
      </FieldGroup>

      {state?.error && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        {/* The submitter's name/value rides along in the FormData, so the
            action knows which button was pressed; the local state only
            drives the pending label. */}
        <Button type="submit" name="intent" value="save" variant={mode === "quote" ? "secondary" : "primary"} disabled={pending} onClick={() => setIntent("save")}>
          {pending && intent === "save" ? "Saving…" : submitLabel}
        </Button>
        {mode === "quote" && (
          <Button type="submit" name="intent" value="issue" disabled={pending} onClick={() => setIntent("issue")}>
            {pending && intent === "issue" ? "Issuing…" : issueLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
