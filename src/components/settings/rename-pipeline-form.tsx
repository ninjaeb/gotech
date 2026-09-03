"use client";

import { useActionState } from "react";
import { renamePipeline } from "@/app/actions/pipelines";
import { Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/components/ui/toast";

export function RenamePipelineForm({ pipelineId, name }: { pipelineId: string; name: string }) {
  const action = renamePipeline.bind(null, pipelineId);
  const [state, formAction, pending] = useActionState(action, undefined);
  useActionToast(state, "Pipeline renamed.", { toastErrors: false });

  return (
    <div>
      <form action={formAction} className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="name">Pipeline name</Label>
          <Input id="name" name="name" defaultValue={name} required />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>
      {state && "error" in state && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
    </div>
  );
}
