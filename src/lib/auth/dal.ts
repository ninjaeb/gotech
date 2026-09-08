import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionPayload } from "@/lib/auth/session";

export const verifySession = cache(async () => {
  const session = await getSessionPayload();
  if (!session?.userId) {
    redirect("/login");
  }
  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, title: true, role: true, sectionLayout: true },
  });
  if (!user) {
    redirect("/login");
  }
  return user;
});

// Developers only get Projects, Tasks, and a trimmed-down Settings — this is
// where a developer landing on a blocked page gets sent instead.
export const DEVELOPER_HOME = "/tasks";
// Partners (external referrers) only ever get the partner portal — see
// src/lib/referrals.ts. The (app) layout bounces them here too, so no CRM
// page is reachable for that role even without its own explicit gate.
export const PARTNER_HOME = "/partner";

// Where a given role belongs when it lands somewhere it shouldn't (or right
// after logging in).
export function homeForRole(role: "ADMIN" | "DEVELOPER" | "PARTNER") {
  if (role === "PARTNER") return PARTNER_HOME;
  if (role === "DEVELOPER") return DEVELOPER_HOME;
  return "/";
}

// For Server Components: redirects non-admins away rather than rendering.
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    redirect(homeForRole(user.role));
  }
  return user;
}

// For the partner portal's Server Components — the mirror image of
// requireAdmin: staff of either role get sent back to their own home.
export async function requirePartner() {
  const user = await getCurrentUser();
  if (user.role !== "PARTNER") {
    redirect(homeForRole(user.role));
  }
  return user;
}

// For the partner portal's Server Actions (same throw-not-redirect
// convention as requireAdminAction).
export async function requirePartnerAction() {
  const user = await getCurrentUser();
  if (user.role !== "PARTNER") {
    throw new Error("Partners only.");
  }
  return user;
}

// For Server Actions: throws rather than redirecting, matching how the rest
// of this codebase's actions reject invalid input (a thrown Error, not a
// navigation) — actions are invoked via forms/transitions, not page loads.
export async function requireAdminAction() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    throw new Error("Admins only.");
  }
  return user;
}
