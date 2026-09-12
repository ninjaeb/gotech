"use client";

import { useActionState, useEffect, useRef } from "react";
import { ListChecks } from "lucide-react";
import { applyTaskTemplateToDeal } from "@/app/actions/pipelines";
import { buttonClasses } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

// Pulls in the deal's pipeline's standard checklist (Settings → Pipelines →
// a pipeline → Task checklist template) — safe to click more than once,
// since applyPipelineTaskTemplate skips any task title already on the deal.
export function ApplyTaskTemplateButton({ dealId }: { dealId: string }) {
  const action = applyTaskTemplateToDeal.bind(null, dealId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const toast = useToast();
  const seenRef = useRef<typeof state>(undefined);

  useEffect(() => {
    if (state === seenRef.current) return;
    seenRef.current = state;
    if (!state) return;
    if ("error" in state) toast.error(state.error);
    else if (state.count > 0) toast.success(`Added ${state.count} standard task${state.count === 1 ? "" : "s"}.`);
    else toast.success("Already up to date — no new standard tasks to add.");
  }, [state, toast]);

  return (
    <form action={formAction}>
      <button type="submit" disabled={pending} className={buttonClasses("secondary", "sm")}>
        <ListChecks className="h-4 w-4" />
        {pending ? "Applying…" : "Apply task template"}
      </button>
    </form>
  );
}
