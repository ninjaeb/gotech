"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { regenerateTestimonialDraft } from "@/app/actions/testimonials";
import { buttonClasses } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function RegenerateDraftButton({ testimonialId }: { testimonialId: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleClick() {
    startTransition(async () => {
      const result = await regenerateTestimonialDraft(testimonialId);
      if (!result.ok) {
        toast.error(result.error);
      } else if (result.regenerated) {
        toast.success("Draft regenerated.");
      } else {
        toast.error("Couldn't generate a new draft — AI may not be configured.");
      }
    });
  }

  return (
    <form action={handleClick}>
      <button type="submit" disabled={pending} className={buttonClasses("ghost", "sm")}>
        <RefreshCw className="h-3.5 w-3.5" />
        {pending ? "Regenerating…" : "Regenerate draft"}
      </button>
    </form>
  );
}
