import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TestimonialSubmitForm } from "@/components/testimonials/testimonial-submit-form";
import { StarRatingInput } from "@/components/testimonials/star-rating-input";
import { Card, CardBody } from "@/components/ui/card";
import { formatDateTime, fullName } from "@/lib/format";

export default async function PublicTestimonialPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const testimonial = await db.testimonial.findUnique({
    where: { token },
    include: { contact: { include: { company: true } } },
  });

  if (!testimonial) notFound();

  const contactName = fullName(testimonial.contact.firstName, testimonial.contact.lastName);
  const authorTitleDefault = [testimonial.contact.title, testimonial.contact.company?.name].filter(Boolean).join(", ");

  return (
    <div className="min-h-full bg-slate-50 px-4 py-12 dark:bg-neutral-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
            G
          </div>
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">GoTech</span>
        </div>

        <Card>
          <CardBody className="space-y-4">
            {testimonial.status === "SUBMITTED" ? (
              <div className="space-y-3 text-center">
                <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  You submitted your testimonial on {formatDateTime(testimonial.submittedAt)} — thank you!
                </p>
                {testimonial.rating && (
                  <div className="flex justify-center">
                    <StarRatingInput readOnly defaultValue={testimonial.rating} />
                  </div>
                )}
                {testimonial.content && (
                  <p className="text-left text-sm italic text-slate-700 dark:text-slate-300">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              <>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Hi {contactName}, thanks for working with us!
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    We&apos;d love a quick testimonial about your experience. We&apos;ve drafted a starting point below
                    based on what we did together — feel free to rewrite it entirely.
                  </p>
                </div>
                <TestimonialSubmitForm
                  token={token}
                  contactName={contactName}
                  authorTitleDefault={authorTitleDefault}
                  initialContent={testimonial.aiDraft ?? ""}
                />
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
