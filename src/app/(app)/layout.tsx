import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { NotificationItem } from "@/components/layout/notification-bell";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

function notificationHref(activity: {
  contactId: string | null;
  companyId: string | null;
  dealId: string | null;
  projectId: string | null;
} | null): string | null {
  if (!activity) return null;
  if (activity.contactId) return `/contacts/${activity.contactId}`;
  if (activity.companyId) return `/companies/${activity.companyId}`;
  if (activity.dealId) return `/deals/${activity.dealId}`;
  if (activity.projectId) return `/projects/${activity.projectId}`;
  return null;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  const endOfToday = new Date();
  endOfToday.setHours(0, 0, 0, 0);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [myTaskAlertCount, notificationRows, unreadNotificationCount] = await Promise.all([
    db.task.count({
      where: { assignees: { some: { userId: user.id } }, completed: false, dueDate: { lt: endOfToday } },
    }),
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: [{ read: "asc" }, { createdAt: "desc" }],
      take: 15,
      include: {
        activity: { select: { contactId: true, companyId: true, dealId: true, projectId: true } },
      },
    }),
    db.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  const notifications: NotificationItem[] = notificationRows.map((notification) => ({
    id: notification.id,
    content: notification.content,
    read: notification.read,
    createdAt: notification.createdAt,
    href: notificationHref(notification.activity),
  }));

  return (
    <div className="flex h-full min-h-full">
      <Sidebar
        user={user}
        myTaskAlertCount={myTaskAlertCount}
        notifications={notifications}
        unreadNotificationCount={unreadNotificationCount}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav
          user={user}
          myTaskAlertCount={myTaskAlertCount}
          notifications={notifications}
          unreadNotificationCount={unreadNotificationCount}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
