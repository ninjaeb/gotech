import { RefreshCw, Trash2 } from "lucide-react";
import type { Testimonial } from "@/generated/prisma/client";
import { deleteTestimonialRequest, regenerateTestimonialDraft } from "@/app/actions/testimonials";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { StarRatingInput } from "@/components/testimonials/star-rating-input";
import { formatDate } from "@/lib/format";

export function TestimonialRequestRow({
  testimonial,
  siteOrigin,
}: {
  testimonial: Testimonial;
  siteOrigin: string;
}) {
  const link = `${siteOrigin}/testimonial/${testimonial.token}`;
  const submitted = testimonial.status === "SUBMITTED";

  return (
    <li className="space-y-2 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {submitted ? (
            <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30">
              Submitted
            </Badge>
          ) : (
            <Badge>Pending</Badge>
          )}
          <span className="text-xs text-slate-400">
            {formatDate(submitted && testimonial.submittedAt ? testimonial.submittedAt : testimonial.createdAt)}
          </span>
        </div>
        <form action={deleteTestimonialRequest.bind(null, testimonial.id)}>
          <ConfirmSubmitButton
            confirmMessage="Delete this testimonial request?"
            variant="ghost"
            size="sm"
            className="!px-1.5 text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </ConfirmSubmitButton>
        </form>
      </div>

      {submitted ? (
        <div className="space-y-1.5">
          {testimonial.rating && <StarRatingInput readOnly defaultValue={testimonial.rating} size="h-4 w-4" />}
          {testimonial.content && (
            <p className="text-sm italic text-slate-700 dark:text-slate-300">&ldquo;{testimonial.content}&rdquo;</p>
          )}
          {testimonial.authorName && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              — {testimonial.authorName}
              {testimonial.authorTitle ? `, ${testimonial.authorTitle}` : ""}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <CopyLinkButton text={link} label="Copy link" />
          <form action={regenerateTestimonialDraft.bind(null, testimonial.id)}>
            <button type="submit" className={buttonClasses("ghost", "sm")}>
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate draft
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
