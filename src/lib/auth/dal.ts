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

// For Server Components: redirects non-admins away rather than rendering.
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    redirect(DEVELOPER_HOME);
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
