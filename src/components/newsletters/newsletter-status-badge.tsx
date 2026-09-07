import { cn } from "@/lib/utils";
import type { NewsletterStatus } from "@/generated/prisma/client";

const STYLES: Record<NewsletterStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-neutral-800 dark:text-slate-300 dark:ring-slate-500/30",
  SCHEDULED: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-500/30",
  SENDING: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-400 dark:ring-sky-500/30",
  SENT: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-500/30",
};

const LABELS: Record<NewsletterStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  SENDING: "Sending",
  SENT: "Sent",
};

export function NewsletterStatusBadge({ status }: { status: NewsletterStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[status],
      )}
    >
      {LABELS[status]}
    </span>
  );
}
