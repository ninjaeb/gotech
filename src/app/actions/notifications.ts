"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";

export async function markNotificationRead(id: string) {
  const currentUser = await getCurrentUser();
  await db.notification.updateMany({
    where: { id, userId: currentUser.id },
    data: { read: true },
  });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const currentUser = await getCurrentUser();
  await db.notification.updateMany({
    where: { userId: currentUser.id, read: false },
    data: { read: true },
  });
  revalidatePath("/", "layout");
}
