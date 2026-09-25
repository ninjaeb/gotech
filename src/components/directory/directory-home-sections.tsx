import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { slugify } from "@/lib/slug";
import { categoryPath, translateCategoryName } from "@/lib/directory-category-labels";
import { DIRECTORY_HOME_COPY } from "@/lib/directory-home-copy";
import { DIRECTORY_STRINGS, directoryBenefitsPath, directorySignupPath, type DirectoryLocale } from "@/lib/directory-i18n";

// The directory home page below its grid: what this directory is, real
// links into every category that has a business in it, how it works, the
// "list your business" call to action, and an FAQ. Server-rendered plain
// HTML, on purpose — until this existed the page's only indexable text was
// the H1, a one-line subtitle, and a <select> full of category names, and
// its only links were the listing cards: the category pages (each in the
// sitemap) had no on-page link at all, the sign-up page was reachable only
// through the hamburger menu's JavaScript, and an AI answer engine had
// nothing quotable about what the directory is or how to use it. Sits
// below the grid rather than above it (an earlier link cloud right under
// the search bar was removed as clutter before any listing showed).
export function DirectoryHomeSections({
  locale,
  categories,
}: {
  locale: DirectoryLocale;
  // Only categories with at least one published business (see
  // countListingsByCategory) — a link to an empty category page helps no
  // one, and those pages are noindex anyway (see buildCategoryMetadata).
  categories: { name: string; count: number }[];
}) {
  const copy = DIRECTORY_HOME_COPY[locale];
  const t = DIRECTORY_STRINGS[locale];
  const headingClasses = "text-xl font-semibold text-slate-900 dark:text-slate-100";

  return (
    <div className="w-full space-y-12 border-t border-slate-200 bg-white px-4 py-12 dark:border-neutral-800 dark:bg-neutral-900 sm:px-8">
      <section aria-labelledby="directory-about" className="mx-auto max-w-3xl text-center">
        <h2 id="directory-about" className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {copy.aboutHeading}
        </h2>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-300">{copy.aboutBody}</p>
      </section>

      {categories.length > 0 && (
        <section aria-labelledby="directory-categories" className="mx-auto max-w-5xl">
          <h2 id="directory-categories" className={headingClasses}>
            {copy.browseHeading}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.browseIntro}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {categories.map(({ name, count }) => (
              <li key={name}>
                <Link
                  href={categoryPath(slugify(name), locale)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-petrol/40 hover:text-petrol dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-200 dark:hover:border-petrol-light/40 dark:hover:text-petrol-light"
                >
                  {translateCategoryName(name, locale)}
                  <span className="text-xs text-slate-400 dark:text-slate-500">{copy.listingCount(count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="directory-how" className="mx-auto max-w-5xl">
        <h2 id="directory-how" className={headingClasses}>
          {copy.howHeading}
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {copy.howSteps.map((step, index) => (
            <li key={step.title} className="rounded-lg border border-slate-200 p-4 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-petrol text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{step.title}</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="directory-list" className="mx-auto max-w-3xl rounded-lg bg-led-soft p-6 text-center dark:bg-led-soft-dark">
        <h2 id="directory-list" className="text-xl font-semibold text-petrol-ink dark:text-petrol-light">
          {copy.listCtaHeading}
        </h2>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{copy.listCtaBody}</p>
        <Link
          href={directorySignupPath(locale)}
          className={buttonClasses(
            "primary",
            "md",
            "mt-4 bg-led text-led-ink hover:bg-led-hover active:bg-led-active focus-visible:ring-led",
          )}
        >
          {t.listBusinessCta}
        </Link>
        <div>
          <Link
            href={directoryBenefitsPath(locale)}
            className="mt-3 inline-block text-sm text-petrol-ink underline hover:no-underline dark:text-petrol-light"
          >
            {t.benefitsNavLabel}
          </Link>
        </div>
      </section>

      <section aria-labelledby="directory-faq" className="mx-auto max-w-3xl">
        <h2 id="directory-faq" className={headingClasses}>
          {t.faqHeading}
        </h2>
        <div className="mt-4 space-y-2">
          {copy.faqs.map((faq) => (
            <details key={faq.question} className="group rounded-md border border-slate-200 px-3 py-2 dark:border-neutral-800">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-base font-semibold text-slate-900 marker:content-none dark:text-slate-100">
                <h3 className="text-base font-semibold">{faq.question}</h3>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-base text-slate-600 dark:text-slate-300">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
