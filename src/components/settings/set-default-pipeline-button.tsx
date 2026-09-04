"use client";

import { useTransition } from "react";
import { Star } from "lucide-react";
import { setDefaultPipeline } from "@/app/actions/pipelines";
import { buttonClasses } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// Imperative toast (not useActionState + useActionToast) on purpose: once
// this pipeline becomes the default, the parent stops rendering this exact
// button at all (it's only shown for non-default pipelines), unmounting it
// before a state-driven effect would ever get to render it.
export function SetDefaultPipelineButton({
  pipelineId,
  variant = "icon",
}: {
  pipelineId: string;
  variant?: "icon" | "labelled";
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await setDefaultPipeline(pipelineId);
        if (result && "error" in result) {
          toast.error(result.error);
        } else {
          toast.success("Default pipeline updated.");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't update default pipeline.");
      }
    });
  }

  if (variant === "labelled") {
    return (
      <form action={handleClick}>
        <button type="submit" disabled={pending} className={cn(buttonClasses("secondary", "sm"))}>
          <Star className="h-3.5 w-3.5" />
          {pending ? "Saving…" : "Set as default pipeline"}
        </button>
      </form>
    );
  }

  return (
    <form action={handleClick}>
      <button
        type="submit"
        disabled={pending}
        title="Set as default"
        aria-label="Set as default"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-amber-500 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:text-amber-400 dark:hover:bg-amber-950 dark:hover:text-amber-300"
      >
        <Star className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
