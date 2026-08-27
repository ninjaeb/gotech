"use client";

import { useActionState, useEffect, useRef } from "react";
import { createServicePackage, updateServicePackage } from "@/app/actions/service-packages";
import { Label, Input, Select, RequiredMark } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PRODUCT_SERVICE_TYPES, PRODUCT_SERVICE_TYPE_LABELS } from "@/lib/labels";
import type { ProductServiceType } from "@/generated/prisma/client";

type ExistingServicePackage = {
  id: string;
  name: string;
  type: ProductServiceType;
  description: string | null;
  unitPrice: number;
  unit: string | null;
};

export function ServicePackageForm({ servicePackage }: { servicePackage?: ExistingServicePackage }) {
  const isEdit = !!servicePackage;
  const formRef = useRef<HTMLFormElement>(null);
  const action = isEdit ? updateServicePackage.bind(null, servicePackage.id) : createServicePackage;
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    // Only the create form clears itself on success — an edit form should
    // keep showing what was just saved, not blank out under the user.
    if (state && "success" in state && !isEdit) {
      formRef.current?.reset();
    }
  }, [state, isEdit]);

  const idPrefix = isEdit ? `edit-service-${servicePackage.id}` : "new-service";

  return (
    <form
      ref={formRef}
      action={formAction}
      className={isEdit ? "space-y-3" : "space-y-3 border-t border-slate-100 pt-4 dark:border-neutral-800"}
    >
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
            defaultValue={servicePackage ? servicePackage.unitPrice : undefined}
            placeholder="0.00"
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
      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Saving…" : isEdit ? "Save changes" : "Add to catalog"}
      </Button>
    </form>
  );
}
