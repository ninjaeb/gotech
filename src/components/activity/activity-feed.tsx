import {
  MessageSquare,
  MessageCircle,
  Phone,
  Mail,
  CalendarClock,
  ArrowRightLeft,
  CheckCircle2,
} from "lucide-react";
import type { Activity } from "@/generated/prisma/client";
import { formatDateTime } from "@/lib/format";
import { ActivityContent } from "@/components/activity/activity-content";
import { AttachmentPreview, type AttachmentInfo } from "@/components/activity/attachment-preview";
import { WhatsAppMediaPreview } from "@/components/whatsapp/whatsapp-media";
import type { UserOption } from "@/lib/mentions";

const ICONS = {
  NOTE: MessageSquare,
  CALL: Phone,
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  MEETING: CalendarClock,
  STAGE_CHANGE: ArrowRightLeft,
  TASK_COMPLETED: CheckCircle2,
} as const;

// Same accent-circle pattern as StatCard — each activity type gets its own
// color instead of one uniform slate circle, so the feed reads at a glance.
const ICON_COLORS = {
  NOTE: "bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-slate-400",
  CALL: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  EMAIL: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
  WHATSAPP: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  MEETING: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  STAGE_CHANGE: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
  TASK_COMPLETED: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
} as const;

export function ActivityFeed({
  activities,
  users,
}: {
  activities: (Activity & { attachments: AttachmentInfo[] })[];
  users: UserOption[];
}) {
  if (activities.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        No activity yet.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {activities.map((activity) => {
        const Icon = ICONS[activity.type];
        return (
          <li key={activity.id} className="flex gap-3">
            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ICON_COLORS[activity.type]}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <ActivityContent
                text={activity.content}
                users={users}
                className="text-sm text-slate-700 dark:text-slate-300"
              />
              {activity.whatsappMediaType && (
                <div className="mt-1.5 max-w-xs">
                  <WhatsAppMediaPreview
                    media={{
                      type: activity.whatsappMediaType,
                      url: `/api/whatsapp/media/${activity.id}`,
                      mimeType: activity.whatsappMediaMimeType ?? "application/octet-stream",
                      name: activity.whatsappMediaName,
                    }}
                  />
                </div>
              )}
              {activity.attachments.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {activity.attachments.map((attachment) => (
                    <AttachmentPreview key={attachment.id} attachment={attachment} />
                  ))}
                </div>
              )}
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                {formatDateTime(activity.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
