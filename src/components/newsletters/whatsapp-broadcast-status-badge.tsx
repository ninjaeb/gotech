import { cn } from "@/lib/utils";
import type { WhatsAppBroadcastStatus } from "@/generated/prisma/client";

const STYLES: Record<WhatsAppBroadcastStatus, string> = {
  SENDING: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-400 dark:ring-sky-500/30",
  SENT: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-500/30",
};

const LABELS: Record<WhatsAppBroadcastStatus, string> = {
  SENDING: "Sending",
  SENT: "Sent",
};

export function WhatsAppBroadcastStatusBadge({ status }: { status: WhatsAppBroadcastStatus }) {
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
