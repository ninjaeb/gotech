"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createServicePackage, updateServicePackage } from "@/app/actions/service-packages";
import { Label, Input, Select, RequiredMark } from "@/components/ui/field";
import { Button, buttonClasses } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { marginAmount, marginPercent } from "@/lib/margin";
import {
  PRODUCT_SERVICE_TYPES,
  PRODUCT_SERVICE_TYPE_LABELS,
  BILLING_FREQUENCIES,
  BILLING_FREQUENCY_LABELS,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ProductServiceType, BillingFrequency } from "@/generated/prisma/client";

type ExistingServicePackage = {
  id: string;
  name: string;
  type: ProductServiceType;
  description: string | null;
  unitPrice: number;
  unitCost: number | null;
  unit: string | null;
  billingFrequency: BillingFrequency;
  components: { productId: string; quantity: number }[];
};

// Eligible components: any other catalog item that doesn't itself already
// have components — bundles are one level deep (see service-packages.ts),
// so something that's already a bundle can't be nested into another one.
type AvailableComponent = { id: string; name: string; unitPrice: number };

type ComponentDraft = { key: string; productId: string; quantity: string };

let draftKeySeq = 0;
function newDraftKey() {
  draftKeySeq += 1;
  return `component-${draftKeySeq}`;
}

export function ServicePackageForm({
  servicePackage,
  availableComponents = [],
  currency = "USD",
}: {
  servicePackage?: ExistingServicePackage;
  availableComponents?: AvailableComponent[];
  currency?: string;
}) {
  const isEdit = !!servicePackage;
  const formRef = useRef<HTMLFormElement>(null);
  const action = isEdit ? updateServicePackage.bind(null, servicePackage.id) : createServicePackage;
  const [state, formAction, pending] = useActionState(action, undefined);

  const [unitPrice, setUnitPrice] = useState(servicePackage ? servicePackage.unitPrice.toString() : "0");
  const [unitCost, setUnitCost] = useState(
    servicePackage?.unitCost != null ? servicePackage.unitCost.toString() : "",
  );
  const [components, setComponents] = useState<ComponentDraft[]>(
    () =>
      servicePackage?.components.map((c) => ({
        key: newDraftKey(),
        productId: c.productId,
        quantity: c.quantity.toString(),
      })) ?? [],
  );

  // Only the create form clears itself on success — an edit form should
  // keep showing what was just saved, not blank out under the user. Split
  // in two: the ref reset stays in an effect (ref access is only allowed
  // outside render), while the controlled-state reset happens by comparing
  // against the last state we reacted to, React's documented alternative
  // to an effect when a setState needs to fire exactly once per change.
  const justSucceeded = !!state && "success" in state && !isEdit;
  useEffect(() => {
    if (justSucceeded) formRef.current?.reset();
  }, [justSucceeded]);

  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (justSucceeded) {
      setUnitPrice("0");
      setUnitCost("");
      setComponents([]);
    }
  }

  const idPrefix = isEdit ? `edit-service-${servicePackage.id}` : "new-service";

  const margin = marginAmount(Number(unitPrice) || 0, unitCost === "" ? null : Number(unitCost));
  const marginPct = marginPercent(Number(unitPrice) || 0, unitCost === "" ? null : Number(unitCost));

  const componentsMap = useMemo(() => new Map(availableComponents.map((c) => [c.id, c])), [availableComponents]);
  const componentsSubtotal = components.reduce((sum, c) => {
    const product = componentsMap.get(c.productId);
    return sum + (product ? product.unitPrice * (Number(c.quantity) || 0) : 0);
  }, 0);

  function updateComponent(key: string, patch: Partial<ComponentDraft>) {
    setComponents((current) => current.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }
  function removeComponent(key: string) {
    setComponents((current) => current.filter((c) => c.key !== key));
  }
  function addComponent() {
    const nextAvailable = availableComponents.find((c) => !components.some((existing) => existing.productId === c.id));
    if (!nextAvailable) return;
    setComponents((current) => [...current, { key: newDraftKey(), productId: nextAvailable.id, quantity: "1" }]);
  }

  const componentsJson = JSON.stringify(
    components.filter((c) => c.productId).map((c) => ({ productId: c.productId, quantity: c.quantity })),
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      className={isEdit ? "space-y-3" : "space-y-3 border-t border-slate-100 pt-4 dark:border-neutral-800"}
    >
      <input type="hidden" name="componentsJson" value={componentsJson} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-name`}>
            Name
            <RequiredMark />
          </Label>
          <Input
            id={`${idPrefix}-name`}
            name="name"
            required
            defaultValue={servicePackage?.name}
            placeholder="Website — Starter package"
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-type`}>Type</Label>
          <Select id={`${idPrefix}-type`} name="type" defaultValue={servicePackage?.type ?? "SERVICE"}>
            {PRODUCT_SERVICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {PRODUCT_SERVICE_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-price`}>
            Unit price
            <RequiredMark />
          </Label>
          <Input
            id={`${idPrefix}-price`}
            name="unitPrice"
            type="number"
            min="0"
            step="0.01"
            required
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-cost`}>Unit cost (optional)</Label>
          <Input
            id={`${idPrefix}-cost`}
            name="unitCost"
            type="number"
            min="0"
            step="0.01"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="What this costs to deliver"
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-unit`}>Unit (optional)</Label>
          <Input
            id={`${idPrefix}-unit`}
            name="unit"
            defaultValue={servicePackage?.unit ?? undefined}
            placeholder="project, hour, month…"
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-billing`}>Billing frequency</Label>
          <Select
            id={`${idPrefix}-billing`}
            name="billingFrequency"
            defaultValue={servicePackage?.billingFrequency ?? "ONE_TIME"}
          >
            {BILLING_FREQUENCIES.map((freq) => (
              <option key={freq} value={freq}>
                {BILLING_FREQUENCY_LABELS[freq]}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor={`${idPrefix}-description`}>Description (optional)</Label>
          <Input
            id={`${idPrefix}-description`}
            name="description"
            defaultValue={servicePackage?.description ?? undefined}
            placeholder="Shown on quotes under the line item"
          />
        </div>
      </div>

      {margin !== null && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Margin: <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(margin, currency)}</span>
          {marginPct !== null && ` (${marginPct.toFixed(0)}%)`}
        </p>
      )}

      {availableComponents.length > 0 && (
        <div className="border-t border-slate-100 pt-3 dark:border-neutral-800">
          <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            Components (optional) — bundle other catalog items into this one
          </p>
          <div className="space-y-2">
            {components.map((component) => {
              const product = componentsMap.get(component.productId);
              return (
                <div key={component.key} className="flex items-center gap-2">
                  <Select
                    value={component.productId}
                    onChange={(e) => updateComponent(component.key, { productId: e.target.value })}
                    aria-label="Component product or service"
                    className="flex-1"
                  >
                    {availableComponents
                      .filter(
                        (c) => c.id === component.productId || !components.some((existing) => existing.productId === c.id),
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={component.quantity}
                    onChange={(e) => updateComponent(component.key, { quantity: e.target.value })}
                    placeholder="Qty"
                    aria-label="Component quantity"
                    className="w-20"
                  />
                  <span className="w-24 shrink-0 text-right text-xs text-slate-400">
                    {product && formatCurrency(product.unitPrice * (Number(component.quantity) || 0), currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeComponent(component.key)}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                    aria-label="Remove component"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addComponent}
            disabled={components.length >= availableComponents.length}
            className={cn(buttonClasses("secondary", "sm"), "mt-2 disabled:cursor-not-allowed disabled:opacity-40")}
          >
            <Plus className="h-4 w-4" />
            Add component
          </button>
          {components.length > 0 && (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Components subtotal:{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {formatCurrency(componentsSubtotal, currency)}
              </span>{" "}
              — this bundle&apos;s own price above is independent, so you can package it below or above that total.
            </p>
          )}
        </div>
      )}

      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Saving…" : isEdit ? "Save changes" : "Add to catalog"}
      </Button>
    </form>
  );
}
