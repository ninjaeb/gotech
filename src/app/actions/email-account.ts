"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
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
    return {
      error: `Couldn't connect: ${error instanceof Error ? error.message : "check your host/port/password"}`,
    };
  }

  const user = await getCurrentUser();
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

export async function disconnectEmailAccount() {
  const user = await getCurrentUser();
  await db.emailAccount.deleteMany({ where: { userId: user.id } });
  revalidatePath("/settings");
}

export async function syncEmailAccountNow() {
  const user = await getCurrentUser();
  const account = await db.emailAccount.findUnique({ where: { userId: user.id } });
  if (!account) return;
  // syncEmailAccount already records the failure on the account row before
  // rethrowing — the UI reads lastSyncError from there, so there's nothing
  // more useful to do with the exception here than let this run end.
  await syncEmailAccount(account).catch(() => {});
  revalidatePath("/settings");
}
