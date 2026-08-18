"use client";

import { useActionState } from "react";
import { createPipeline } from "@/app/actions/pipelines";
import { Label, Input, RequiredMark } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function NewPipelineForm() {
  const [state, formAction, pending] = useActionState(createPipeline, undefined);

  return (
    <form action={formAction} className="space-y-2 border-t border-slate-100 pt-4 dark:border-neutral-800">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="new-pipeline-name">
            Pipeline name
            <RequiredMark />
          </Label>
          <Input id="new-pipeline-name" name="name" required placeholder="Maintenance retainer" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create pipeline"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
    </form>
  );
}
