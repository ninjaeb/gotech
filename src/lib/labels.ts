import { ActivityType, DealStage, QuoteStatus, TaskType } from "@/generated/prisma/client";

export const DEAL_STAGES: DealStage[] = [
  "LEAD",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  LEAD: "Lead",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

export const DEAL_STAGE_BADGE_CLASSES: Record<DealStage, string> = {
  LEAD: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
  QUALIFIED:
    "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-500/30",
  PROPOSAL:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  NEGOTIATION:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-500/30",
  WON: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
  LOST: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-500/30",
};

export const TASK_TYPES: TaskType[] = [
  "CALL",
  "EMAIL",
  "MEETING",
  "FOLLOW_UP",
  "OTHER",
];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  FOLLOW_UP: "Follow-up",
  OTHER: "Other",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  NOTE: "Note",
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  STAGE_CHANGE: "Stage change",
  TASK_COMPLETED: "Task completed",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
};

export const QUOTE_STATUS_BADGE_CLASSES: Record<QuoteStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
  SENT: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-500/30",
  VIEWED:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  ACCEPTED:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
  DECLINED: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-500/30",
};
