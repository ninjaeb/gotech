import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionPayload } from "@/lib/auth/session";
import type { Role } from "@/generated/prisma/client";

export const verifySession = cache(async () => {
  const session = await getSessionPayload();
  if (!session?.userId) {
    redirect("/system/login");
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
    redirect("/system/login");
  }
  return user;
});

// Technical team members only get Projects, Tasks, and a trimmed-down
// Settings — this is where one landing on a blocked page gets sent instead.
export const TECHNICAL_HOME = "/system/tasks";
// Partners (external referrers) only ever get the business portal — see
// src/lib/referrals.ts. The (dashboard) layout bounces them here too, so no
// CRM page is reachable for that role even without its own explicit gate.
export const PARTNER_HOME = "/business";

// Where a given role belongs when it lands somewhere it shouldn't (or right
// after logging in). ADMIN and SALES share the dashboard as their home —
// the sales pipeline overview is exactly what a Sales login wants to land on.
export function homeForRole(role: Role) {
  if (role === "PARTNER") return PARTNER_HOME;
  if (role === "TECHNICAL") return TECHNICAL_HOME;
  return "/system";
}

// For Server Components: redirects non-admins away rather than rendering.
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    redirect(homeForRole(user.role));
  }
  return user;
}

// For the business portal's Server Components — the mirror image of
// requireAdmin: staff of either role get sent back to their own home.
export async function requirePartner() {
  const user = await getCurrentUser();
  if (user.role !== "PARTNER") {
    redirect(homeForRole(user.role));
  }
  return user;
}

// For the business portal's Server Actions (same throw-not-redirect
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

// Companies/Contacts/Deals/Quotes and the sales-facing dashboard —
// Admin and Sales alike do this work day to day; Technical and Partner
// don't.
const SALES_ROLES: Role[] = ["ADMIN", "SALES"];

export async function requireSales() {
  const user = await getCurrentUser();
  if (!SALES_ROLES.includes(user.role)) {
    redirect(homeForRole(user.role));
  }
  return user;
}

export async function requireSalesAction() {
  const user = await getCurrentUser();
  if (!SALES_ROLES.includes(user.role)) {
    throw new Error("Not allowed.");
  }
  return user;
}

// A project's own status, budget, and timeline — Admin and Technical alike
// manage these day to day; Sales and Partner don't. Tasks are a separate,
// broader case (see requireStaff below) even though they're also reached
// from the Projects page: a project's milestones are still just Tasks.
const TECHNICAL_ROLES: Role[] = ["ADMIN", "TECHNICAL"];

export async function requireTechnical() {
  const user = await getCurrentUser();
  if (!TECHNICAL_ROLES.includes(user.role)) {
    redirect(homeForRole(user.role));
  }
  return user;
}

export async function requireTechnicalAction() {
  const user = await getCurrentUser();
  if (!TECHNICAL_ROLES.includes(user.role)) {
    throw new Error("Not allowed.");
  }
  return user;
}

// Tasks aren't one team's domain — they're embedded unconditionally on
// Company/Contact/Deal pages (Sales' own domain) and Project pages
// (Technical's), so every real staff role manages its own; only Partner
// (who never reaches any of those pages anyway) is excluded.
export async function requireStaff() {
  const user = await getCurrentUser();
  if (user.role === "PARTNER") {
    redirect(homeForRole(user.role));
  }
  return user;
}

export async function requireStaffAction() {
  const user = await getCurrentUser();
  if (user.role === "PARTNER") {
    throw new Error("Not allowed.");
  }
  return user;
}
