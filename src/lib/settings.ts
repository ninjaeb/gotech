import { cache } from "react";
import { db } from "@/lib/db";
import { DEFAULT_WEEKLY_HOURS, parseWeeklyHours, type WeeklyHours } from "@/lib/booking";
import type { DirectoryApprovalMode } from "@/generated/prisma/client";

const SETTINGS_ID = "singleton";

const DEFAULT_SETTINGS = {
  id: SETTINGS_ID,
  currency: "USD",
  bookingUtcOffsetMinutes: 480,
  bookingSlotMinutes: 30,
  bookingWeeklyHours: JSON.stringify(DEFAULT_WEEKLY_HOURS),
  taskReminderHour: 8,
  taskAssignmentNotificationDelayMinutes: 0,
  newsletterSubscribeListId: null as string | null,
  referralCommissionRate: 10,
  referralLandingUrl: "https://gotka.com/landing/new-business/",
  directoryApprovalMode: "EVERY_SUBMISSION" as DirectoryApprovalMode,
  businessName: "",
  businessRegistrationNo: null as string | null,
  businessAddress: null as string | null,
  businessPhone: null as string | null,
  businessEmail: null as string | null,
  businessWebsite: null as string | null,
  taxLabel: "SST",
  taxRate: 0,
  taxRegistrationNo: null as string | null,
  quoteNumberPrefix: "Q-",
  invoiceNumberPrefix: "INV-",
  numberPadding: 4,
  quoteValidityDays: 30,
  invoiceDueDays: 14,
  defaultQuoteTerms: null as string | null,
  defaultInvoiceNotes: null as string | null,
  paymentInstructions: null as string | null,
  syncDealValueFromAcceptedQuote: true,
};

export const getSettings = cache(async () => {
  const settings = await db.settings.findUnique({ where: { id: SETTINGS_ID } });
  return settings ?? DEFAULT_SETTINGS;
});

export async function getCurrency() {
  const settings = await getSettings();
  return settings.currency;
}

export async function setCurrency(currency: string) {
  await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, currency },
    update: { currency },
  });
}

export async function getBookingSettings() {
  const settings = await getSettings();
  return {
    utcOffsetMinutes: settings.bookingUtcOffsetMinutes,
    slotMinutes: settings.bookingSlotMinutes,
    weeklyHours: parseWeeklyHours(settings.bookingWeeklyHours),
  };
}

export async function setBookingSettings(data: {
  utcOffsetMinutes: number;
  slotMinutes: number;
  weeklyHours: WeeklyHours;
}) {
  const values = {
    bookingUtcOffsetMinutes: data.utcOffsetMinutes,
    bookingSlotMinutes: data.slotMinutes,
    bookingWeeklyHours: JSON.stringify(data.weeklyHours),
  };
  await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...values },
    update: values,
  });
}

// The local hour (0-23, in bookingUtcOffsetMinutes' timezone) the daily
// WhatsApp task reminder should send at — see
// scripts/send-task-digests-whatsapp.ts.
export async function getTaskReminderHour() {
  const settings = await getSettings();
  return settings.taskReminderHour;
}

export async function setTaskReminderHour(hour: number) {
  await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, taskReminderHour: hour },
    update: { taskReminderHour: hour },
  });
}

// How long (in minutes) to hold a task assignment notification before
// actually sending it — 0 sends immediately. See notifyTaskAssignment in
// src/app/actions/tasks.ts and PendingTaskAssignmentNotification.
export async function getTaskAssignmentNotificationDelayMinutes() {
  const settings = await getSettings();
  return settings.taskAssignmentNotificationDelayMinutes;
}

export async function setTaskAssignmentNotificationDelayMinutes(minutes: number) {
  await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, taskAssignmentNotificationDelayMinutes: minutes },
    update: { taskAssignmentNotificationDelayMinutes: minutes },
  });
}

// The ContactList the public newsletter subscribe form adds new contacts
// to — see src/lib/newsletter-subscribe.ts. Null until an admin picks one
// from Settings → Newsletter.
export async function getNewsletterSubscribeListId() {
  const settings = await getSettings();
  return settings.newsletterSubscribeListId;
}

export async function setNewsletterSubscribeListId(listId: string | null) {
  await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, newsletterSubscribeListId: listId },
    update: { newsletterSubscribeListId: listId },
  });
}

// Referral program defaults (Settings → Referrals) — see
// src/lib/referrals.ts. commissionRate is a percent of a won deal's value.
export async function getReferralSettings() {
  const settings = await getSettings();
  return {
    commissionRate: Number(settings.referralCommissionRate),
    landingUrl: settings.referralLandingUrl,
  };
}

export async function setReferralSettings(data: { commissionRate: number; landingUrl: string }) {
  const values = { referralCommissionRate: data.commissionRate, referralLandingUrl: data.landingUrl };
  await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...values },
    update: values,
  });
}

// Settings → Directory's "Listing approval" control — see
// DirectoryApprovalMode in schema.prisma for what each value means, and
// its enforcement in src/app/actions/directory.ts's submitDirectoryListingForReview.
export async function getDirectoryApprovalMode() {
  const settings = await getSettings();
  return settings.directoryApprovalMode;
}

export async function setDirectoryApprovalMode(mode: DirectoryApprovalMode) {
  await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, directoryApprovalMode: mode },
    update: { directoryApprovalMode: mode },
  });
}

// Settings → Billing — everything a quote or invoice needs at create/issue
// time, in one read: issuer identity (snapshotted onto the document at
// issue), tax, numbering, defaults and the deal-value sync toggle, plus the
// org's currency and UTC offset so callers don't need a second lookup.
// taxRate is a plain number here (the Decimal column can't cross the
// Server → Client boundary).
export type BillingSettings = {
  currency: string;
  utcOffsetMinutes: number;
  businessName: string;
  businessRegistrationNo: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  businessWebsite: string | null;
  taxLabel: string;
  taxRate: number;
  taxRegistrationNo: string | null;
  quoteNumberPrefix: string;
  invoiceNumberPrefix: string;
  numberPadding: number;
  quoteValidityDays: number;
  invoiceDueDays: number;
  defaultQuoteTerms: string | null;
  defaultInvoiceNotes: string | null;
  paymentInstructions: string | null;
  syncDealValueFromAcceptedQuote: boolean;
};

export async function getBillingSettings(): Promise<BillingSettings> {
  const settings = await getSettings();
  return {
    currency: settings.currency,
    utcOffsetMinutes: settings.bookingUtcOffsetMinutes,
    businessName: settings.businessName,
    businessRegistrationNo: settings.businessRegistrationNo,
    businessAddress: settings.businessAddress,
    businessPhone: settings.businessPhone,
    businessEmail: settings.businessEmail,
    businessWebsite: settings.businessWebsite,
    taxLabel: settings.taxLabel,
    taxRate: Number(settings.taxRate),
    taxRegistrationNo: settings.taxRegistrationNo,
    quoteNumberPrefix: settings.quoteNumberPrefix,
    invoiceNumberPrefix: settings.invoiceNumberPrefix,
    numberPadding: settings.numberPadding,
    quoteValidityDays: settings.quoteValidityDays,
    invoiceDueDays: settings.invoiceDueDays,
    defaultQuoteTerms: settings.defaultQuoteTerms,
    defaultInvoiceNotes: settings.defaultInvoiceNotes,
    paymentInstructions: settings.paymentInstructions,
    syncDealValueFromAcceptedQuote: settings.syncDealValueFromAcceptedQuote,
  };
}

export type BillingSettingsPatch = Partial<Omit<BillingSettings, "currency" | "utcOffsetMinutes">>;

// Each Settings → Billing card saves just its own fields, so a partial
// patch — the other cards' values are untouched.
export async function setBillingSettings(patch: BillingSettingsPatch) {
  await db.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...patch },
    update: patch,
  });
}
