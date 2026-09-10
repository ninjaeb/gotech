"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction, requirePartnerAction } from "@/lib/auth/dal";
import { setReferralSettings } from "@/lib/settings";

export type ReferralActionState = { error: string } | { success: true } | undefined;

// ---------------------------------------------------------------------------
// Partner side
// ---------------------------------------------------------------------------

const withdrawalSchema = z.object({
  paymentDetails: z.string().trim().min(1, "Tell us how you'd like to be paid (bank account, e-wallet, ...)."),
});

// Bundles every APPROVED, not-yet-requested commission into one withdrawal
// request. The commission rows are linked (not copied) so a rejection can
// release them back into the available balance — see rejectReferralWithdrawal.
// One open request at a time: a second one while the first is still
// unresolved would just confuse whoever's paying out.
export async function requestReferralWithdrawal(
  _prevState: ReferralActionState,
  formData: FormData,
): Promise<ReferralActionState> {
  const partner = await requirePartnerAction();
  const parsed = withdrawalSchema.safeParse({ paymentDetails: formData.get("paymentDetails") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  const open = await db.referralWithdrawal.findFirst({ where: { partnerId: partner.id, status: "REQUESTED" } });
  if (open) {
    return { error: "You already have a withdrawal request waiting to be paid." };
  }

  const available = await db.referralCommission.findMany({
    where: { partnerId: partner.id, status: "APPROVED", withdrawalId: null },
    select: { id: true, amount: true },
  });
  if (available.length === 0) {
    return { error: "Nothing to withdraw yet — commissions become available once an admin approves them." };
  }
  const amount = available.reduce((sum, commission) => sum + Number(commission.amount), 0);

  await db.$transaction(async (tx) => {
    const withdrawal = await tx.referralWithdrawal.create({
      data: { partnerId: partner.id, amount, paymentDetails: parsed.data.paymentDetails },
    });
    await tx.referralCommission.updateMany({
      where: { id: { in: available.map((commission) => commission.id) } },
      data: { withdrawalId: withdrawal.id },
    });
  });

  revalidatePath("/business-portal");
  revalidatePath("/business-portal/commissions");
  revalidatePath("/system/referrals");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Admin side
// ---------------------------------------------------------------------------

const referralSettingsSchema = z.object({
  commissionRate: z.coerce.number().min(0, "Rate can't be negative").max(100, "Rate can't exceed 100%"),
  landingUrl: z.string().trim().url("Enter a full URL, including https://"),
});

export async function updateReferralSettings(
  _prevState: ReferralActionState,
  formData: FormData,
): Promise<ReferralActionState> {
  await requireAdminAction();
  const parsed = referralSettingsSchema.safeParse({
    commissionRate: formData.get("commissionRate"),
    landingUrl: formData.get("landingUrl"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  }
  await setReferralSettings(parsed.data);
  revalidatePath("/system/settings/referrals");
  revalidatePath("/system/referrals");
  revalidatePath("/business-portal");
  return { success: true };
}

const partnerRateSchema = z.object({
  rate: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100), {
      message: "Enter a rate between 0 and 100",
    }),
});

// A per-partner override of the default rate; blank clears it back to the
// default. Only affects commissions earned from now on — existing ones keep
// the rate they were snapshotted at (see ReferralCommission).
export async function updatePartnerCommissionRate(userId: string, formData: FormData) {
  await requireAdminAction();
  const parsed = partnerRateSchema.safeParse({ rate: formData.get("rate") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid rate");
  }
  await db.user.update({ where: { id: userId, role: "PARTNER" }, data: { referralCommissionRate: parsed.data.rate } });
  revalidatePath("/system/referrals");
  revalidatePath("/system/settings/team");
}

function revalidateReferralPaths() {
  revalidatePath("/system/referrals");
  revalidatePath("/business-portal");
  revalidatePath("/business-portal/leads");
  revalidatePath("/business-portal/commissions");
}

export async function approveReferralCommission(id: string, formData: FormData) {
  void formData;
  await requireAdminAction();
  await db.referralCommission.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  revalidateReferralPaths();
}

// Only a commission nobody's been paid for yet — once it's PAID the money
// has left the building and voiding the record would just hide that.
export async function voidReferralCommission(id: string, formData: FormData) {
  void formData;
  await requireAdminAction();
  await db.referralCommission.updateMany({
    where: { id, status: { in: ["PENDING", "APPROVED"] }, withdrawalId: null },
    data: { status: "VOID" },
  });
  revalidateReferralPaths();
}

// The admin has actually sent the money: close the request and mark every
// commission it bundled as PAID in one go.
export async function markReferralWithdrawalPaid(id: string, formData: FormData) {
  await requireAdminAction();
  const note = String(formData.get("note") ?? "").trim() || null;
  const now = new Date();
  await db.$transaction(async (tx) => {
    const result = await tx.referralWithdrawal.updateMany({
      where: { id, status: "REQUESTED" },
      data: { status: "PAID", adminNote: note, resolvedAt: now },
    });
    if (result.count === 0) return;
    await tx.referralCommission.updateMany({
      where: { withdrawalId: id },
      data: { status: "PAID", paidAt: now },
    });
  });
  revalidateReferralPaths();
}

// Unlinks the bundled commissions so they go straight back into the
// partner's available balance (they're still APPROVED — it's the request
// that was refused, e.g. bad bank details, not the commissions).
export async function rejectReferralWithdrawal(id: string, formData: FormData) {
  await requireAdminAction();
  const note = String(formData.get("note") ?? "").trim() || null;
  await db.$transaction(async (tx) => {
    const result = await tx.referralWithdrawal.updateMany({
      where: { id, status: "REQUESTED" },
      data: { status: "REJECTED", adminNote: note, resolvedAt: new Date() },
    });
    if (result.count === 0) return;
    await tx.referralCommission.updateMany({ where: { withdrawalId: id }, data: { withdrawalId: null } });
  });
  revalidateReferralPaths();
}
