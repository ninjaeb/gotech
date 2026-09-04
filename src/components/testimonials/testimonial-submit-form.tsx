"use client";

import { useActionState } from "react";
import { submitTestimonial } from "@/app/actions/testimonials";
import { StarRatingInput } from "@/components/testimonials/star-rating-input";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";

export function TestimonialSubmitForm({
  token,
  contactName,
  authorTitleDefault,
  initialContent,
}: {
  token: string;
  contactName: string;
  authorTitleDefault: string;
  initialContent: string;
}) {
  // No client-side "success" branch here on purpose — submitTestimonial's
  // own revalidatePath refreshes this page's server data as part of
  // resolving the form action, and the parent page (src/app/testimonial/
  // [token]/page.tsx) re-renders its own "already submitted" view from that
  // fresh status before this component would ever get to show one of its
  // own. Same division of labor as QuoteResponseButtons/the public quote
  // page: the child triggers the mutation, the parent owns what "done"
  // looks like.
  const [state, formAction, pending] = useActionState(submitTestimonial.bind(null, token), undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <FieldGroup label="Your testimonial" htmlFor="content" required>
          <Textarea
            id="content"
            name="content"
            rows={6}
            required
            defaultValue={initialContent}
            placeholder="Share your experience working with us…"
          />
        </FieldGroup>
        <p className="mt-1 text-xs text-slate-400">
          We drafted a starting point for you — edit it however you like before submitting.
        </p>
      </div>

      <FieldGroup label="Rating (optional)" htmlFor="rating">
        <StarRatingInput name="rating" />
      </FieldGroup>

      <FieldGroup label="Your name" htmlFor="authorName" required>
        <Input id="authorName" name="authorName" required defaultValue={contactName} />
      </FieldGroup>
      <FieldGroup label="Your title / company" htmlFor="authorTitle">
        <Input id="authorTitle" name="authorTitle" placeholder="Optional" defaultValue={authorTitleDefault} />
      </FieldGroup>

      {state?.status === "error" && <p className="text-sm text-rose-600 dark:text-rose-400">{state.message}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Submitting…" : "Submit testimonial"}
      </Button>
    </form>
  );
}
