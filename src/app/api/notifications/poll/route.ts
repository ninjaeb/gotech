import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { notificationHref } from "@/lib/notification-href";

// Polled client-side by NotificationPoller to drive desktop/browser
// notifications for items that arrived after the page last loaded — the
// bell dropdown itself is server-rendered and doesn't need this route.
export async function GET(request: Request) {
  const user = await getCurrentUser();

  const since = new Date(new URL(request.url).searchParams.get("since") ?? "");
  if (Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "Invalid or missing `since` timestamp." }, { status: 400 });
  }

  const rows = await db.notification.findMany({
    where: { userId: user.id, createdAt: { gt: since } },
    orderBy: { createdAt: "asc" },
    take: 20,
    include: {
      activity: { select: { taskId: true, contactId: true, companyId: true, dealId: true, projectId: true } },
    },
  });

  return NextResponse.json({
    notifications: rows.map((notification) => ({
      id: notification.id,
      content: notification.content,
      createdAt: notification.createdAt.toISOString(),
      href: notificationHref(notification),
    })),
  });
}
