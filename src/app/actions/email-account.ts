"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminAction } from "@/lib/auth/dal";
import { encryptSecret } from "@/lib/email-crypto";
import { testEmailConnection, syncEmailAccount } from "@/lib/email";

const connectSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  imapHost: z.string().trim().min(1, "IMAP host is required"),
  imapPort: z.coerce.number().int().positive(),
  imapSecure: z.boolean(),
  smtpHost: z.string().trim().min(1, "SMTP host is required"),
  smtpPort: z.coerce.number().int().positive(),
  smtpSecure: z.boolean(),
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type EmailAccountFormState = { error: string } | undefined;

// imapflow rejects a bad IMAP response (most often a rejected login) with
// the bare message "Command failed" — the server's actual explanation
// ("Invalid credentials", "Application-specific password required", etc.)
// lands separately on `.responseText`, which this surfaces instead.
// nodemailer's SMTP errors already fold the server response into `.message`
// (see _formatError in smtp-connection), so they need no such lookup.
function describeEmailError(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "responseText" in error &&
    typeof error.responseText === "string" &&
    error.responseText
  ) {
    return error.responseText;
  }
  if (error instanceof Error) return error.message;
  return "check your host/port/password";
}

export async function connectEmailAccount(
  _prevState: EmailAccountFormState,
  formData: FormData,
): Promise<EmailAccountFormState> {
  const parsed = connectSchema.safeParse({
    email: formData.get("email"),
    imapHost: formData.get("imapHost"),
    imapPort: formData.get("imapPort"),
    imapSecure: formData.get("imapSecure") === "on",
    smtpHost: formData.get("smtpHost"),
    smtpPort: formData.get("smtpPort"),
    smtpSecure: formData.get("smtpSecure") === "on",
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid connection details" };
  }
  const data = parsed.data;

  try {
    await testEmailConnection(data);
  } catch (error) {
    return { error: `Couldn't connect: ${describeEmailError(error)}` };
  }

  const user = await requireAdminAction();
  await db.emailAccount.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      email: data.email,
      imapHost: data.imapHost,
      imapPort: data.imapPort,
      imapSecure: data.imapSecure,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      smtpSecure: data.smtpSecure,
      username: data.username,
      encryptedPassword: encryptSecret(data.password),
    },
    update: {
      email: data.email,
      imapHost: data.imapHost,
      imapPort: data.imapPort,
      imapSecure: data.imapSecure,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      smtpSecure: data.smtpSecure,
      username: data.username,
      encryptedPassword: encryptSecret(data.password),
      // A fresh connect (e.g. new password) restarts sync bookkeeping —
      // stale UID checkpoints from the old credentials aren't meaningful.
      syncState: "{}",
      lastSyncedAt: null,
      lastSyncError: null,
    },
  });

  revalidatePath("/settings");
  return undefined;
}

const senderSettingsSchema = z.object({
  fromName: z.string().trim().max(200, "Keep it under 200 characters"),
  htmlSignature: z.string(),
});

export type EmailSenderSettingsFormState = { error: string } | { success: true } | undefined;

// Deliberately separate from connectEmailAccount — a display name and
// signature are cosmetic, not credentials, and forcing a full
// disconnect/reconnect (re-entering IMAP/SMTP host/port/password) just to
// edit a signature would be a bad trade for something this low-stakes.
export async function updateEmailSenderSettings(
  _prevState: EmailSenderSettingsFormState,
  formData: FormData,
): Promise<EmailSenderSettingsFormState> {
  const parsed = senderSettingsSchema.safeParse({
    fromName: formData.get("fromName"),
    htmlSignature: formData.get("htmlSignature"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await requireAdminAction();
  await db.emailAccount.update({
    where: { userId: user.id },
    data: {
      fromName: parsed.data.fromName || null,
      htmlSignature: parsed.data.htmlSignature.trim() || null,
    },
  });

  revalidatePath("/settings/integrations");
  return { success: true };
}

export async function disconnectEmailAccount() {
  const user = await requireAdminAction();
  await db.emailAccount.deleteMany({ where: { userId: user.id } });
  revalidatePath("/settings");
}

export async function syncEmailAccountNow() {
  const user = await requireAdminAction();
  const account = await db.emailAccount.findUnique({ where: { userId: user.id } });
  if (!account) return;
  // syncEmailAccount already records the failure on the account row before
  // rethrowing — the UI reads lastSyncError from there, so there's nothing
  // more useful to do with the exception here than let this run end.
  await syncEmailAccount(account).catch(() => {});
  revalidatePath("/settings");
}
