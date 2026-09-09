"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { createBusinessSession, deleteBusinessSession } from "@/lib/business/session";
import { PARTNER_HOME, homeForRole } from "@/lib/auth/dal";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginState = { error: string } | undefined;

// Staff sign-in, at /system/login. A correct password for a PARTNER
// account is rejected here rather than just quietly working (it would,
// since homeForRole sends every role somewhere valid) — /system and
// /business are meant to be two separate front doors, not one login form
// that happens to fan out, so each checks it's being used by its own
// audience.
export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid) {
    return { error: "Invalid email or password" };
  }
  if (user.role === "PARTNER") {
    return { error: "This sign-in is for staff. Business accounts sign in at /business/login." };
  }

  await createSession(user.id);
  redirect(homeForRole(user.role));
}

export async function logout() {
  await deleteSession();
  redirect("/system/login");
}

// Business (partner) sign-in, at /business/login — the mirror image of
// login() above: a staff account's correct password is rejected here too,
// same reasoning. Creates a business_session (src/lib/business/session.ts)
// rather than the staff session — a separate cookie and signing key, so
// this never touches (or gets touched by) a staff login in the same
// browser.
export async function businessLogin(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid) {
    return { error: "Invalid email or password" };
  }
  if (user.role !== "PARTNER") {
    return { error: "This sign-in is for business accounts. Staff sign in at /system/login." };
  }

  await createBusinessSession(user.id);
  redirect(PARTNER_HOME);
}

// Business sign-out, at /business — clears only the business_session
// cookie (never logout()'s own staff session cookie), and redirects back
// to the business login rather than logout()'s /system/login, so a
// business owner signing out lands back at their own front door and any
// simultaneous staff session in the same browser is left untouched.
export async function businessLogout() {
  await deleteBusinessSession();
  redirect("/business/login");
}
