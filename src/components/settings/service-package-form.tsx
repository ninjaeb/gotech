"use client";

import { useActionState, useEffect, useRef } from "react";
import { createServicePackage } from "@/app/actions/service-packages";
import { Label, Input, RequiredMark } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function ServicePackageForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createServicePackage, undefined);

  useEffect(() => {
    if (state && "success" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 border-t border-slate-100 pt-4 dark:border-neutral-800"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="new-service-name">
            Name
            <RequiredMark />
          </Label>
          <Input id="new-service-name" name="name" required placeholder="Website — Starter package" />
        </div>
        <div>
          <Label htmlFor="new-service-price">
            Unit price
            <RequiredMark />
          </Label>
          <Input id="new-service-price" name="unitPrice" type="number" min="0" step="0.01" required placeholder="0.00" />
        </div>
        <div>
          <Label htmlFor="new-service-unit">Unit (optional)</Label>
          <Input id="new-service-unit" name="unit" placeholder="project, hour, month…" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="new-service-description">Description (optional)</Label>
          <Input id="new-service-description" name="description" placeholder="Shown on quotes under the line item" />
        </div>
      </div>
      {state && "error" in state && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Adding…" : "Add service"}
      </Button>
    </form>
  );
}
