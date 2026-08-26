import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-1.5 flex flex-wrap items-center gap-1 text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-neutral-700" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="max-w-[16rem] truncate text-slate-500 hover:text-indigo-600 hover:underline dark:text-slate-400"
              >
                {item.label}
              </Link>
            ) : (
              <span className="max-w-[20rem] truncate text-slate-500 dark:text-slate-400">
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
