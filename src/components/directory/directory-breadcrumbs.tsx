import Link from "next/link";

// Visible counterpart to buildBreadcrumbJsonLd's structured data (see
// src/lib/directory.ts) — same items, rendered twice: the JSON-LD is what a
// rich-result snippet reads, this is what a visitor (and a crawler
// following real hyperlinks rather than parsing schema) actually sees.
// Until this existed, a listing or category page had no on-page path back
// to its parent category or the directory home at all. The last item is
// the current page, shown as plain text rather than a link.
export function DirectoryBreadcrumbs({
  items,
  navLabel,
}: {
  // Root-first, absolute URLs — exactly the array passed to
  // buildBreadcrumbJsonLd. Same-origin by construction (built from
  // getSiteOrigin() plus this app's own path helpers), so pulling just the
  // pathname out of each one for the link href is safe.
  items: { name: string; url: string }[];
  navLabel: string;
}) {
  return (
    <nav aria-label={navLabel} className="text-sm text-slate-500 dark:text-slate-400">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.url} className="flex items-center gap-1.5">
              {index > 0 && (
                <span aria-hidden="true" className="text-slate-300 dark:text-neutral-600">
                  /
                </span>
              )}
              {isLast ? (
                <span aria-current="page" className="text-slate-700 dark:text-slate-300">
                  {item.name}
                </span>
              ) : (
                <Link href={new URL(item.url).pathname} className="hover:text-petrol dark:hover:text-petrol-light">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
