"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  setCurrency,
  setBookingSettings,
  setBillingSettings,
  setTaskReminderHour,
  setTaskAssignmentNotificationDelayMinutes,
  setNewsletterSubscribeListId,
} from "@/lib/settings";
import { TASK_ASSIGNMENT_DELAY_OPTIONS_MINUTES } from "@/lib/task-notification-delay";
import { CURRENCY_CODES } from "@/lib/currency";
import type { WeeklyHours } from "@/lib/booking";
import { requireAdminAction } from "@/lib/auth/dal";
import { runTaskReminders, TEMPLATE_NAME, type TaskReminderRunResult } from "@/lib/task-reminder";
import { sendWhatsAppTemplateMessage, WHATSAPP_ACCOUNT_ID } from "@/lib/whatsapp";
import { getConfiguredSiteOrigin } from "@/lib/site-url";

// Shared by the simple single-field settings forms below — each just
// saves one value and reports back whether it worked.
export type SimpleSaveState = { error: string } | { success: true } | undefined;

const currencySchema = z.enum(CURRENCY_CODES as [string, ...string[]]);

export async function updateCurrency(_prevState: SimpleSaveState, formData: FormData): Promise<SimpleSaveState> {
  await requireAdminAction();
  const parsed = currencySchema.safeParse(formData.get("currency"));
  if (!parsed.success) {
    return { error: "Invalid currency" };
  }
  await setCurrency(parsed.data);
  revalidatePath("/", "layout");
  return { success: true };
}

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Invalid time");
const daySchema = z.object({ enabled: z.boolean(), start: timeSchema, end: timeSchema });
const bookingSettingsSchema = z.object({
  utcOffsetMinutes: z.coerce.number().int().min(-720).max(840),
  slotMinutes: z.coerce.number().int().positive(),
  weeklyHours: z.array(daySchema).length(7),
});

export async function updateBookingSettings(
  _prevState: SimpleSaveState,
  formData: FormData,
): Promise<SimpleSaveState> {
  await requireAdminAction();
  let weeklyHours: unknown;
  try {
    weeklyHours = JSON.parse(String(formData.get("weeklyHoursJson") || "[]"));
  } catch {
    return { error: "Weekly hours could not be read — try again." };
  }

  const parsed = bookingSettingsSchema.safeParse({
    utcOffsetMinutes: formData.get("utcOffsetMinutes"),
    slotMinutes: formData.get("slotMinutes"),
    weeklyHours,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid booking settings" };
  }

  await setBookingSettings({
    utcOffsetMinutes: parsed.data.utcOffsetMinutes,
    slotMinutes: parsed.data.slotMinutes,
    weeklyHours: parsed.data.weeklyHours as WeeklyHours,
  });
  revalidatePath("/system/settings/forms");
  revalidatePath("/book");
  return { success: true };
}

const taskReminderHourSchema = z.coerce.number().int().min(0).max(23);

export async function updateTaskReminderHour(
  _prevState: SimpleSaveState,
  formData: FormData,
): Promise<SimpleSaveState> {
  await requireAdminAction();
  const parsed = taskReminderHourSchema.safeParse(formData.get("taskReminderHour"));
  if (!parsed.success) {
    return { error: "Invalid hour" };
  }
  await setTaskReminderHour(parsed.data);
  revalidatePath("/system/settings/integrations");
  return { success: true };
}

const taskAssignmentNotificationDelaySchema = z.coerce
  .number()
  .int()
  .refine((minutes) => (TASK_ASSIGNMENT_DELAY_OPTIONS_MINUTES as readonly number[]).includes(minutes), {
    message: "Invalid delay",
  });

export async function updateTaskAssignmentNotificationDelay(
  _prevState: SimpleSaveState,
  formData: FormData,
): Promise<SimpleSaveState> {
  await requireAdminAction();
  const parsed = taskAssignmentNotificationDelaySchema.safeParse(formData.get("delayMinutes"));
  if (!parsed.success) {
    return { error: "Invalid delay" };
  }
  await setTaskAssignmentNotificationDelayMinutes(parsed.data);
  revalidatePath("/system/settings/integrations");
  return { success: true };
}

const newsletterSubscribeListSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null);

// Which STATIC ContactList the public newsletter subscribe form (hosted
// page + embeddable widget) adds new contacts to — see
// src/lib/newsletter-subscribe.ts. Clearing the selection turns the
// public form off (it returns a 503/"not configured" error) rather than
// falling back to some default list.
export async function updateNewsletterSubscribeList(
  _prevState: SimpleSaveState,
  formData: FormData,
): Promise<SimpleSaveState> {
  await requireAdminAction();
  const parsed = newsletterSubscribeListSchema.safeParse(formData.get("listId"));
  if (!parsed.success) {
    return { error: "Invalid list" };
  }
  await setNewsletterSubscribeListId(parsed.data);
  revalidatePath("/system/settings/newsletter");
  return { success: true };
}

// For the "Send now" button (Settings → Integrations) — troubleshooting a
// send without waiting for the configured hour or a user's 20h rate limit.
// Same send path as the cron script's --force flag (see
// src/lib/task-reminder.ts), so this can never behave differently. Takes
// the (prevState, formData) shape useActionState expects, even though
// neither is used, so the button component can call it directly.
export async function sendTaskRemindersNow(
  prevState: TaskReminderRunResult | undefined,
  formData: FormData,
): Promise<TaskReminderRunResult> {
  void prevState;
  void formData;
  await requireAdminAction();
  const result = await runTaskReminders({ force: true });
  revalidatePath("/system/settings/integrations");
  return result;
}

export type TaskDigestTemplateTestState = { error: string } | { success: true } | undefined;

// "Send test" button (Settings → Integrations) for the digest template
// itself (TEMPLATE_NAME in task-reminder.ts) — separate from "Send now"
// above, which runs the real digest against real task data and skips
// anyone (the clicking admin included) who has nothing due. This always
// sends, with placeholder counts, to just the clicking admin's own
// number — the point is checking the template is approved and
// reachable, not reporting real task state.
export async function sendTaskDigestTemplateTest(
  prevState: TaskDigestTemplateTestState,
  formData: FormData,
): Promise<TaskDigestTemplateTestState> {
  void prevState;
  void formData;
  const admin = await requireAdminAction();

  const account = await db.whatsAppAccount.findUnique({ where: { id: WHATSAPP_ACCOUNT_ID } });
  if (!account) {
    return { error: "WhatsApp Business isn't connected." };
  }

  const { phone } = await db.user.findUniqueOrThrow({ where: { id: admin.id }, select: { phone: true } });
  if (!phone) {
    return { error: "Set your own WhatsApp number first, from Settings → Team." };
  }

  const siteOrigin = getConfiguredSiteOrigin();
  if (!siteOrigin) {
    return { error: "SITE_URL isn't set — see the README's WhatsApp task reminder section." };
  }

  const firstName = admin.name.trim().split(/\s+/)[0] || admin.name;
  try {
    await sendWhatsAppTemplateMessage(
      account,
      phone,
      TEMPLATE_NAME,
      "en",
      [firstName, "2", "3", `${siteOrigin}/system/tasks?filter=due&assignee=${admin.id}`],
      [firstName],
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Send failed." };
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// Settings → Billing. Four cards, each saving its own slice; every one is
// admin-only (they change what gets printed on legal documents). None of
// these touch documents already issued — issuer details are snapshotted at
// issue (see issueQuote), and numbering changes only affect numbers
// allocated afterwards.

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

const businessDetailsSchema = z.object({
  businessName: z.string().trim().max(191),
  businessRegistrationNo: optionalText(100),
  businessAddress: optionalText(2000),
  businessPhone: optionalText(50),
  businessEmail: z
    .string()
    .trim()
    .max(191)
    .optional()
    .transform((value) => value || null)
    .refine((value) => value === null || z.email().safeParse(value).success, { message: "Enter a valid business email" }),
  businessWebsite: optionalText(191),
});

const LOGO_MAX_BYTES = 1024 * 1024; // 1 MB — it's printed at ~50px tall
const LOGO_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

function revalidateBilling() {
  revalidatePath("/system/settings/billing");
  revalidatePath("/system/settings");
}

export async function updateBusinessDetails(_prevState: SimpleSaveState, formData: FormData): Promise<SimpleSaveState> {
  await requireAdminAction();
  const parsed = businessDetailsSchema.safeParse({
    businessName: formData.get("businessName") ?? "",
    businessRegistrationNo: formData.get("businessRegistrationNo") ?? "",
    businessAddress: formData.get("businessAddress") ?? "",
    businessPhone: formData.get("businessPhone") ?? "",
    businessEmail: formData.get("businessEmail") ?? "",
    businessWebsite: formData.get("businessWebsite") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid business details" };

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!LOGO_MIME_TYPES.has(logo.type)) return { error: "The logo must be a PNG, JPEG, WebP or SVG image." };
    if (logo.size > LOGO_MAX_BYTES) return { error: "The logo must be 1 MB or smaller." };
    const data = Buffer.from(await logo.arrayBuffer()).toString("base64");
    await db.businessLogo.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", mimeType: logo.type, size: logo.size, data },
      update: { mimeType: logo.type, size: logo.size, data },
    });
  } else if (formData.get("removeLogo") === "on") {
    await db.businessLogo.deleteMany({ where: { id: "singleton" } });
  }

  await setBillingSettings(parsed.data);
  revalidateBilling();
  revalidatePath("/api/settings/logo");
  return { success: true };
}

const taxSettingsSchema = z.object({
  taxLabel: z.string().trim().min(1, "Tax label is required").max(20),
  taxRate: z
    .string()
    .trim()
    .regex(/^\d{1,3}(\.\d{1,2})?$/, "Tax rate must be a percent with at most 2 decimals")
    .refine((value) => Number(value) <= 100, "Tax rate can't exceed 100%")
    .transform(Number),
  taxRegistrationNo: optionalText(100),
});

export async function updateTaxSettings(_prevState: SimpleSaveState, formData: FormData): Promise<SimpleSaveState> {
  await requireAdminAction();
  const parsed = taxSettingsSchema.safeParse({
    taxLabel: formData.get("taxLabel") ?? "",
    taxRate: formData.get("taxRate") || "0",
    taxRegistrationNo: formData.get("taxRegistrationNo") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid tax settings" };
  if (parsed.data.taxRate > 0 && !parsed.data.taxRegistrationNo) {
    return { error: "Enter the tax registration number before charging tax — it has to appear on every document." };
  }
  await setBillingSettings(parsed.data);
  revalidateBilling();
  return { success: true };
}

const prefixSchema = z.string().trim().max(10).regex(/^[A-Za-z0-9\-_/]*$/, "Prefixes can only contain letters, numbers, - _ and /");
const numberingSchema = z.object({
  quoteNumberPrefix: prefixSchema,
  invoiceNumberPrefix: prefixSchema,
  numberPadding: z.coerce.number().int().min(3, "Pad to at least 3 digits").max(8, "Pad to at most 8 digits"),
});

export async function updateNumberingSettings(_prevState: SimpleSaveState, formData: FormData): Promise<SimpleSaveState> {
  await requireAdminAction();
  const parsed = numberingSchema.safeParse({
    quoteNumberPrefix: formData.get("quoteNumberPrefix") ?? "",
    invoiceNumberPrefix: formData.get("invoiceNumberPrefix") ?? "",
    numberPadding: formData.get("numberPadding"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid numbering settings" };
  if (parsed.data.quoteNumberPrefix === parsed.data.invoiceNumberPrefix) {
    return { error: "Quotes and invoices need different prefixes so their numbers can't be confused." };
  }
  await setBillingSettings(parsed.data);
  revalidateBilling();
  return { success: true };
}

const documentDefaultsSchema = z.object({
  quoteValidityDays: z.coerce.number().int().min(1).max(365),
  invoiceDueDays: z.coerce.number().int().min(0).max(365),
  defaultQuoteTerms: optionalText(10000),
  defaultInvoiceNotes: optionalText(10000),
  paymentInstructions: optionalText(5000),
  syncDealValueFromAcceptedQuote: z.boolean(),
});

export async function updateDocumentDefaults(_prevState: SimpleSaveState, formData: FormData): Promise<SimpleSaveState> {
  await requireAdminAction();
  const parsed = documentDefaultsSchema.safeParse({
    quoteValidityDays: formData.get("quoteValidityDays"),
    invoiceDueDays: formData.get("invoiceDueDays"),
    defaultQuoteTerms: formData.get("defaultQuoteTerms") ?? "",
    defaultInvoiceNotes: formData.get("defaultInvoiceNotes") ?? "",
    paymentInstructions: formData.get("paymentInstructions") ?? "",
    syncDealValueFromAcceptedQuote: formData.get("syncDealValueFromAcceptedQuote") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid defaults" };
  await setBillingSettings(parsed.data);
  revalidateBilling();
  return { success: true };
}
