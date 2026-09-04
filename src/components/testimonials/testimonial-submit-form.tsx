"use client";

import { useActionState, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { rewriteTestimonialText, submitTestimonial } from "@/app/actions/testimonials";
import { StarRatingInput } from "@/components/testimonials/star-rating-input";
import { Button, buttonClasses } from "@/components/ui/button";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

export function TestimonialSubmitForm({
  token,
  contactName,
  authorTitleDefault,
  initialContent,
  aiAvailable,
}: {
  token: string;
  contactName: string;
  authorTitleDefault: string;
  initialContent: string;
  aiAvailable: boolean;
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

  // The content field is controlled (unlike the others) so "Rewrite with
  // AI" can replace it in place — a plain defaultValue can't be updated
  // from outside the form the way it's set up here.
  const [content, setContent] = useState(initialContent);
  const [rewriting, startRewrite] = useTransition();
  const toast = useToast();

  function handleRewrite() {
    startRewrite(async () => {
      const result = await rewriteTestimonialText(token, content);
      if (result.ok) {
        setContent(result.draft);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <FieldGroup label="Your testimonial" htmlFor="content" required>
          <Textarea
            id="content"
            name="content"
            rows={6}
            required
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Share your experience working with us…"
          />
        </FieldGroup>
        <div className="mt-1.5 flex items-start justify-between gap-2">
          <p className="text-xs text-slate-400">
            We drafted a starting point for you — edit it however you like before submitting.
          </p>
          {aiAvailable && (
            <button
              type="button"
              onClick={handleRewrite}
              disabled={rewriting || pending}
              className={buttonClasses("ghost", "sm", "shrink-0")}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {rewriting ? "Rewriting…" : "Rewrite with AI"}
            </button>
          )}
        </div>
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
