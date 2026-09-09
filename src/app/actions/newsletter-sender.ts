"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { encryptSecret } from "@/lib/email-crypto";
import { testNewsletterSmtp } from "@/lib/newsletter-sender";

const senderSchema = z.object({
  fromName: z.string().trim().min(1, "From name is required"),
  fromEmail: z.string().trim().email("Enter a valid email"),
  smtpHost: z.string().trim().min(1, "SMTP host is required"),
  smtpPort: z.coerce.number().int().positive(),
  smtpSecure: z.boolean(),
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type NewsletterSenderFormState = { error: string } | { success: true } | undefined;

// nodemailer's SMTP errors already fold the server's own explanation into
// `.message` (see the same reasoning in src/app/actions/email-account.ts).
function describeSmtpError(error: unknown): string {
  return error instanceof Error ? error.message : "check your host/port/password";
}

// One combined save (unlike EmailAccount's split connect/updateSenderSettings)
// — the newsletter sender has no signature or other cosmetic-only field
// worth editing independently of its credentials, so there's no case this
// would need to skip re-entering the password for. Full re-entry every save
// is a fine trade for a screen an admin sets up once and rarely revisits.
export async function saveNewsletterSender(
  _prevState: NewsletterSenderFormState,
  formData: FormData,
): Promise<NewsletterSenderFormState> {
  await requireAdminAction();
  const parsed = senderSchema.safeParse({
    fromName: formData.get("fromName"),
    fromEmail: formData.get("fromEmail"),
    smtpHost: formData.get("smtpHost"),
    smtpPort: formData.get("smtpPort"),
    smtpSecure: formData.get("smtpSecure") === "on",
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid sender details" };
  }
  const data = parsed.data;

  try {
    await testNewsletterSmtp(data);
  } catch (error) {
    return { error: `Couldn't connect: ${describeSmtpError(error)}` };
  }

  const values = {
    fromName: data.fromName,
    fromEmail: data.fromEmail,
    smtpHost: data.smtpHost,
    smtpPort: data.smtpPort,
    smtpSecure: data.smtpSecure,
    username: data.username,
    encryptedPassword: encryptSecret(data.password),
  };
  await db.newsletterSender.upsert({
    where: { id: "singleton" },
    create: values,
    update: values,
  });

  revalidatePath("/system/settings/newsletter");
  return { success: true };
}

export async function deleteNewsletterSender(
  _prevState: NewsletterSenderFormState,
  formData: FormData,
): Promise<NewsletterSenderFormState> {
  void formData;
  await requireAdminAction();
  await db.newsletterSender.deleteMany({ where: { id: "singleton" } });
  revalidatePath("/system/settings/newsletter");
  return { success: true };
}
