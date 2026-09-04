"use client";

import { useTransition } from "react";
import { Sparkles } from "lucide-react";
import { requestTestimonial } from "@/app/actions/testimonials";
import { buttonClasses } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

// Imperative toast + useTransition on purpose, not a bare form action — a
// thrown error from a directly-invoked server action (the admin check, a
// DB error) never reaches the user otherwise, it just looks like the
// button did nothing. See SetDefaultPipelineButton for the same pattern.
export function TestimonialRequestButton({ contactId }: { contactId: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleClick() {
    startTransition(async () => {
      const result = await requestTestimonial(contactId);
      if (result.ok) {
        toast.success("Testimonial request created.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form action={handleClick}>
      <button type="submit" disabled={pending} className={buttonClasses("secondary", "sm")}>
        <Sparkles className="h-4 w-4" />
        {pending ? "Requesting…" : "Request testimonial"}
      </button>
    </form>
  );
}
