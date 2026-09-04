import type { Testimonial } from "@/generated/prisma/client";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { Badge } from "@/components/ui/badge";
import { DeleteTestimonialButton } from "@/components/testimonials/delete-testimonial-button";
import { RegenerateDraftButton } from "@/components/testimonials/regenerate-draft-button";
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
        <DeleteTestimonialButton testimonialId={testimonial.id} />
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
          <RegenerateDraftButton testimonialId={testimonial.id} />
        </div>
      )}
    </li>
  );
}
