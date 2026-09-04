"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteTestimonialRequest } from "@/app/actions/testimonials";
import { buttonClasses } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function DeleteTestimonialButton({ testimonialId }: { testimonialId: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function handleClick() {
    if (!confirm("Delete this testimonial request?")) return;
    startTransition(async () => {
      const result = await deleteTestimonialRequest(testimonialId);
      if (result.ok) {
        toast.success("Testimonial request deleted.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className={buttonClasses("ghost", "sm", "!px-1.5 text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300")}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
