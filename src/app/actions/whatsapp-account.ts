"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { encryptSecret } from "@/lib/email-crypto";
import { WHATSAPP_ACCOUNT_ID, testWhatsAppConnection } from "@/lib/whatsapp";

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
