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

export function ActivityFeed({
  activities,
  users,
}: {
  activities: Activity[];
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
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-slate-400">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <ActivityContent
                text={activity.content}
                users={users}
                className="text-sm text-slate-700 dark:text-slate-300"
              />
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
