import {
  ActivityType,
  EnrollmentStatus,
  InvoiceStatus,
  ProjectStatus,
  QuoteStatus,
  TaskType,
} from "@/generated/prisma/client";

// Stage names are now per-pipeline data, not a fixed enum, so there's no
// static label map — a badge's color comes from its isWon/isLost flags (won
// and lost always read as emerald/rose, matching every existing WON/LOST
// convention in this app) and a small rotating palette for stages in
// between, so an arbitrary-length pipeline still reads as visually varied
// without per-stage color configuration.
const MID_STAGE_BADGE_PALETTE = [
  "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
  "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-500/30",
  "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-500/30",
  "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:ring-fuchsia-500/30",
];
const WON_BADGE_CLASSES =
  "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30";
const LOST_BADGE_CLASSES =
  "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-500/30";

export function stageBadgeClasses(stage: { isWon: boolean; isLost: boolean; sortOrder: number }) {
  if (stage.isWon) return WON_BADGE_CLASSES;
  if (stage.isLost) return LOST_BADGE_CLASSES;
  return MID_STAGE_BADGE_PALETTE[stage.sortOrder % MID_STAGE_BADGE_PALETTE.length];
}

export const TASK_TYPES: TaskType[] = [
  "CALL",
  "EMAIL",
  "MEETING",
  "FOLLOW_UP",
  "MILESTONE",
  "OTHER",
];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  FOLLOW_UP: "Follow-up",
  MILESTONE: "Milestone",
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

export const PROJECT_STATUSES: ProjectStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
};

export const PROJECT_STATUS_BADGE_CLASSES: Record<ProjectStatus, string> = {
  NOT_STARTED:
    "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
  IN_PROGRESS:
    "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-500/30",
  ON_HOLD:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  COMPLETED:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
};

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "DRAFT",
  "DEPOSIT_SENT",
  "PROGRESS_BILLED",
  "PAID_IN_FULL",
];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  DEPOSIT_SENT: "Deposit sent",
  PROGRESS_BILLED: "Progress billed",
  PAID_IN_FULL: "Paid in full",
};

export const INVOICE_STATUS_BADGE_CLASSES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
  DEPOSIT_SENT: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-500/30",
  PROGRESS_BILLED:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-500/30",
  PAID_IN_FULL:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  STOPPED_REPLY: "Stopped — replied",
  STOPPED_MANUAL: "Stopped",
  FAILED: "Failed",
};

export const ENROLLMENT_STATUS_BADGE_CLASSES: Record<EnrollmentStatus, string> = {
  ACTIVE: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-500/30",
  COMPLETED:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
  STOPPED_REPLY:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-500/30",
  STOPPED_MANUAL:
    "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-500/30",
};
