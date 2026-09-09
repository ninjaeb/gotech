import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { getReferralSettings } from "@/lib/settings";

// The referral program's shared logic — see the comment block above
// ReferralClick in prisma/schema.prisma for the end-to-end flow. Everything
// here is called from a few places (public lead form, deal stage changes,
// the business portal, the admin Referrals page), so it lives together
// rather than being spread across those callers.

// Only ever letters/digits/hyphens: this goes straight into a URL path
// (/r/<code>) and a ?ref= query value, and the embed widget only accepts
// this shape back (see public/embed/lead-form.js) so a stray value in the
// URL can't smuggle anything odd into a submission.
export const REFERRAL_CODE_PATTERN = /^[a-z0-9-]{3,40}$/;

// "jane-x7k2": the partner's first name for recognizability (a partner is
// going to paste this link into messages, so it shouldn't look like a
// tracking token) plus a short random suffix so two Janes never collide.
// Retries on the vanishingly-rare suffix clash rather than assuming.
export async function generateReferralCode(name: string): Promise<string> {
  const base =
    name
      .trim()
      .split(/\s+/)[0]
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20) || "partner";
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = randomBytes(3).toString("hex").slice(0, 4);
    const code = `${base}-${suffix}`;
    const taken = await db.user.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (!taken) return code;
  }
  return `${base}-${randomBytes(6).toString("hex")}`;
}

// Resolves a ?ref= value from a public form submission to the partner it
// belongs to, or null — an unknown/malformed/non-partner code is simply
// ignored rather than rejected, since the visitor filling in the form
// isn't the one who typed it and shouldn't be blocked by it.
export async function findPartnerByReferralCode(raw: unknown): Promise<{ id: string; name: string } | null> {
  const code = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!REFERRAL_CODE_PATTERN.test(code)) return null;
  return db.user.findFirst({ where: { referralCode: code, role: "PARTNER" }, select: { id: true, name: true } });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Called whenever a deal lands in (or leaves) a won stage — see
// src/app/actions/deals.ts. Idempotent on the deal (ReferralCommission.dealId
// is unique), so both the stage-change and the full-edit path can call it
// freely:
//   - won, no commission yet     → create one (PENDING) at the partner's
//                                  rate (or the default), snapshotting the
//                                  deal's value at this moment
//   - won, PENDING commission    → re-price it from the deal's current value
//                                  (an admin often fills the value in after
//                                  marking it won)
//   - won, APPROVED/PAID/VOID    → leave it alone — an admin has already
//                                  made a decision about that money
//   - not won, PENDING           → VOID it (the deal was re-opened before
//                                  anyone approved)
//   - not won, anything else     → leave it alone, same reasoning
// A deal with no referrer is a no-op throughout.
export async function syncReferralCommissionForDeal(dealId: string, isWon: boolean): Promise<void> {
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      title: true,
      value: true,
      referredById: true,
      referredBy: { select: { referralCommissionRate: true } },
      referralCommission: { select: { id: true, status: true } },
    },
  });
  if (!deal?.referredById) return;

  const existing = deal.referralCommission;

  if (!isWon) {
    if (existing?.status === "PENDING") {
      await db.referralCommission.update({ where: { id: existing.id }, data: { status: "VOID" } });
    }
    return;
  }

  if (existing && existing.status !== "PENDING") return;

  const rate =
    deal.referredBy?.referralCommissionRate !== null && deal.referredBy?.referralCommissionRate !== undefined
      ? Number(deal.referredBy.referralCommissionRate)
      : (await getReferralSettings()).commissionRate;
  const dealValue = Number(deal.value);
  const amount = round2((dealValue * rate) / 100);

  if (existing) {
    await db.referralCommission.update({
      where: { id: existing.id },
      data: { rate, dealValue, amount, dealTitle: deal.title },
    });
    return;
  }
  await db.referralCommission.create({
    data: { partnerId: deal.referredById, dealId: deal.id, dealTitle: deal.title, rate, dealValue, amount },
  });
}

export type PartnerStats = {
  clicks: number;
  clicksLast30Days: number;
  leads: number;
  wonDeals: number;
  // Everything ever earned that wasn't voided (PENDING + APPROVED + PAID).
  earned: number;
  // Won but not yet approved by an admin.
  pending: number;
  // Approved and not yet bundled into a withdrawal request — what a
  // "Request withdrawal" would pay out right now.
  available: number;
  // Bundled into a withdrawal that hasn't been paid (or rejected) yet.
  requested: number;
  paid: number;
};

// One query set for both the business portal's overview and the admin
// Referrals page's per-partner table, so both always agree on the numbers.
export async function getPartnerStats(partnerId: string): Promise<PartnerStats> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [clicks, clicksLast30Days, leads, wonDeals, commissions] = await Promise.all([
    db.referralClick.count({ where: { partnerId } }),
    db.referralClick.count({ where: { partnerId, createdAt: { gte: since } } }),
    db.deal.count({ where: { referredById: partnerId } }),
    db.deal.count({ where: { referredById: partnerId, pipelineStage: { isWon: true } } }),
    db.referralCommission.findMany({
      where: { partnerId, status: { not: "VOID" } },
      select: { amount: true, status: true, withdrawalId: true },
    }),
  ]);

  const stats: PartnerStats = {
    clicks,
    clicksLast30Days,
    leads,
    wonDeals,
    earned: 0,
    pending: 0,
    available: 0,
    requested: 0,
    paid: 0,
  };
  for (const commission of commissions) {
    const amount = Number(commission.amount);
    stats.earned += amount;
    if (commission.status === "PENDING") stats.pending += amount;
    else if (commission.status === "PAID") stats.paid += amount;
    else if (commission.status === "APPROVED") {
      if (commission.withdrawalId) stats.requested += amount;
      else stats.available += amount;
    }
  }
  return stats;
}

// Same idea as the partner status badge on the deal list: a referred deal
// is Won, Lost, or still Open, read off its stage's flags — the partner
// portal never exposes the CRM's actual stage names, just this.
export function referredDealStatus(stage: { isWon: boolean; isLost: boolean }): "OPEN" | "WON" | "LOST" {
  if (stage.isWon) return "WON";
  if (stage.isLost) return "LOST";
  return "OPEN";
}
