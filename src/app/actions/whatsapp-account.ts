"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { encryptSecret } from "@/lib/email-crypto";
import {
  WHATSAPP_ACCOUNT_ID,
  MENTION_TEMPLATE_NAME,
  MENTION_REPLY_TEMPLATE_NAME,
  TASK_ASSIGNMENT_TEMPLATE_NAME,
  testWhatsAppConnection,
  sendWhatsAppTemplateMessage,
} from "@/lib/whatsapp";
import { getSiteOrigin } from "@/lib/site-url";

const connectSchema = z.object({
  phoneNumberId: z.string().trim().min(1, "Phone number ID is required"),
  businessAccountId: z.string().trim().min(1, "WhatsApp Business Account ID is required"),
  accessToken: z.string().trim().min(1, "Access token is required"),
  appSecret: z.string().trim().min(1, "App secret is required"),
});

export type WhatsAppAccountFormState = { error: string } | undefined;

export async function connectWhatsAppAccount(
  _prevState: WhatsAppAccountFormState,
  formData: FormData,
): Promise<WhatsAppAccountFormState> {
  const parsed = connectSchema.safeParse({
    phoneNumberId: formData.get("phoneNumberId"),
    businessAccountId: formData.get("businessAccountId"),
    accessToken: formData.get("accessToken"),
    appSecret: formData.get("appSecret"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid connection details" };
  }
  const data = parsed.data;

  let displayPhoneNumber: string | null;
  try {
    ({ displayPhoneNumber } = await testWhatsAppConnection(data));
  } catch (error) {
    return { error: `Couldn't connect: ${error instanceof Error ? error.message : "check your credentials"}` };
  }

  await requireAdminAction();
  await db.whatsAppAccount.upsert({
    where: { id: WHATSAPP_ACCOUNT_ID },
    create: {
      id: WHATSAPP_ACCOUNT_ID,
      phoneNumberId: data.phoneNumberId,
      businessAccountId: data.businessAccountId,
      displayPhoneNumber,
      encryptedAccessToken: encryptSecret(data.accessToken),
      encryptedAppSecret: encryptSecret(data.appSecret),
      // Generated once and kept stable across reconnects — this is what the
      // user pastes into Meta's webhook config, and rotating it silently on
      // every credential update would break that subscription until they
      // noticed and re-verified it.
      webhookVerifyToken: randomBytes(24).toString("hex"),
    },
    update: {
      phoneNumberId: data.phoneNumberId,
      businessAccountId: data.businessAccountId,
      displayPhoneNumber,
      encryptedAccessToken: encryptSecret(data.accessToken),
      encryptedAppSecret: encryptSecret(data.appSecret),
      lastSyncError: null,
    },
  });

  revalidatePath("/settings/integrations");
  return undefined;
}

export async function disconnectWhatsAppAccount() {
  await requireAdminAction();
  await db.whatsAppAccount.deleteMany({ where: { id: WHATSAPP_ACCOUNT_ID } });
  revalidatePath("/settings/integrations");
}

export type MentionNotificationTestState = { error: string } | { success: true } | undefined;

// "Send test" button (Settings → Integrations) for the mention_notification
// template — unlike the daily digest, an @mention notification has no
// scheduled run to manually trigger, so this is the only way to check the
// template is approved and working without waiting to actually be
// @mentioned. Sends to the clicking admin's own number (never someone
// else's), and — unlike notifyMentionsViaWhatsApp, which swallows every
// failure since a WhatsApp notification there is only ever a bonus on top
// of the in-app one — surfaces the real error, since the whole point here
// is finding out whether it works.
export async function sendMentionNotificationTest(
  prevState: MentionNotificationTestState,
  formData: FormData,
): Promise<MentionNotificationTestState> {
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

  const siteOrigin = await getSiteOrigin();
  try {
    await sendWhatsAppTemplateMessage(account, phone, MENTION_TEMPLATE_NAME, "en", [
      admin.name,
      "This is a test mention notification from GoTech CRM.",
      `${siteOrigin}/settings/integrations`,
    ]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Send failed." };
  }
  return { success: true };
}

// "Send test" for the mention_reply_notification template — the other half
// of the mention-reply loop (see notifyMentionsViaWhatsApp and the webhook
// route's handleMentionReply), with no real reply to wait for. Sends to
// the clicking admin's own number with placeholder content, same reasoning
// and same real-error-surfacing as sendMentionNotificationTest above.
export async function sendMentionReplyNotificationTest(
  prevState: MentionNotificationTestState,
  formData: FormData,
): Promise<MentionNotificationTestState> {
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

  const siteOrigin = await getSiteOrigin();
  try {
    await sendWhatsAppTemplateMessage(account, phone, MENTION_REPLY_TEMPLATE_NAME, "en", [
      admin.name,
      "This is a test mention notification from GoTech CRM.",
      "This is a test reply.",
      `${siteOrigin}/settings/integrations`,
    ]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Send failed." };
  }
  return { success: true };
}

export type TaskAssignmentNotificationTestState = { error: string } | { success: true } | undefined;

// "Send test" button (Settings → Integrations) for the
// task_assignment_notification template — same reasoning as the
// mention_notification test above: task assignment has no scheduled run to
// manually trigger, so this is the only way to check the template without
// actually assigning someone a task. Sends to the clicking admin's own
// number, and surfaces the real error rather than swallowing it.
export async function sendTaskAssignmentNotificationTest(
  prevState: TaskAssignmentNotificationTestState,
  formData: FormData,
): Promise<TaskAssignmentNotificationTestState> {
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

  const siteOrigin = await getSiteOrigin();
  try {
    await sendWhatsAppTemplateMessage(account, phone, TASK_ASSIGNMENT_TEMPLATE_NAME, "en", [
      admin.name,
      "This is a test task assignment notification from GoTech CRM.",
      `${siteOrigin}/settings/integrations`,
    ]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Send failed." };
  }
  return { success: true };
}
