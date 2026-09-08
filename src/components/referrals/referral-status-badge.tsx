import { cn } from "@/lib/utils";
import type { ReferralCommissionStatus, ReferralWithdrawalStatus } from "@/generated/prisma/client";

const NEUTRAL = "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-neutral-800 dark:text-slate-300 dark:ring-slate-500/30";
const AMBER = "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-500/30";
const SKY = "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-400 dark:ring-sky-500/30";
const GREEN =
  "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-500/30";
const ROSE = "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-400 dark:ring-rose-500/30";

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", className)}>
      {children}
    </span>
  );
}

// Open / Won / Lost for a referred deal — see referredDealStatus in
// src/lib/referrals.ts for why the partner never sees actual stage names.
export function ReferredDealStatusBadge({ status }: { status: "OPEN" | "WON" | "LOST" }) {
  const styles = { OPEN: SKY, WON: GREEN, LOST: NEUTRAL };
  const labels = { OPEN: "In progress", WON: "Won", LOST: "Lost" };
  return <Pill className={styles[status]}>{labels[status]}</Pill>;
}

export function CommissionStatusBadge({ status }: { status: ReferralCommissionStatus }) {
  const styles: Record<ReferralCommissionStatus, string> = { PENDING: AMBER, APPROVED: SKY, PAID: GREEN, VOID: NEUTRAL };
  const labels: Record<ReferralCommissionStatus, string> = {
    PENDING: "Awaiting approval",
    APPROVED: "Approved",
    PAID: "Paid",
    VOID: "Void",
  };
  return <Pill className={styles[status]}>{labels[status]}</Pill>;
}

export function WithdrawalStatusBadge({ status }: { status: ReferralWithdrawalStatus }) {
  const styles: Record<ReferralWithdrawalStatus, string> = { REQUESTED: AMBER, PAID: GREEN, REJECTED: ROSE };
  const labels: Record<ReferralWithdrawalStatus, string> = { REQUESTED: "Requested", PAID: "Paid", REJECTED: "Rejected" };
  return <Pill className={styles[status]}>{labels[status]}</Pill>;
}
