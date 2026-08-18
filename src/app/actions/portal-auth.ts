"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createPortalSession, deletePortalSession } from "@/lib/portal/session";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type PortalLoginState = { error: string } | undefined;

export async function portalLogin(_prevState: PortalLoginState, formData: FormData): Promise<PortalLoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const clientUser = await db.clientUser.findUnique({ where: { email: parsed.data.email } });
  const valid = clientUser?.passwordHash
    ? await verifyPassword(parsed.data.password, clientUser.passwordHash)
    : false;
  if (!clientUser || !valid) {
    return { error: "Invalid email or password" };
  }

  await createPortalSession(clientUser.id);
  redirect("/portal");
}

export async function portalLogout() {
  await deletePortalSession();
  redirect("/portal/login");
}

const acceptInviteSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type AcceptInviteState = { error: string } | undefined;

export async function acceptPortalInvite(
  token: string,
  _prevState: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const parsed = acceptInviteSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const clientUser = await db.clientUser.findUnique({ where: { inviteToken: token } });
  if (!clientUser || !clientUser.inviteTokenExpiresAt || clientUser.inviteTokenExpiresAt < new Date()) {
    return { error: "This invite link is invalid or has expired." };
  }

  await db.clientUser.update({
    where: { id: clientUser.id },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      inviteToken: null,
      inviteTokenExpiresAt: null,
    },
  });

  await createPortalSession(clientUser.id);
  redirect("/portal");
}
