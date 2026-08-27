import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationPoller } from "@/components/layout/notification-poller";
import type { NotificationItem } from "@/components/layout/notification-bell";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { notificationHref } from "@/lib/notification-href";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  const endOfToday = new Date();
  endOfToday.setHours(0, 0, 0, 0);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [myTaskAlertCount, notificationRows, unreadNotificationCount, latestNotification] = await Promise.all([
    db.task.count({
      where: { assignees: { some: { userId: user.id } }, completed: false, dueDate: { lt: endOfToday } },
    }),
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: [{ read: "asc" }, { createdAt: "desc" }],
      take: 15,
      include: {
        activity: { select: { taskId: true, contactId: true, companyId: true, dealId: true, projectId: true } },
      },
    }),
    db.notification.count({ where: { userId: user.id, read: false } }),
    // Separate from notificationRows above (sorted read-then-date, so its
    // first row isn't reliably the newest) — this seeds the desktop-alert
    // poller's cursor so it never re-notifies for something already on
    // screen at load.
    db.notification.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const notifications: NotificationItem[] = notificationRows.map((notification) => ({
    id: notification.id,
    content: notification.content,
    read: notification.read,
    createdAt: notification.createdAt,
    href: notificationHref(notification),
  }));

  return (
    <div className="flex h-full min-h-full">
      <NotificationPoller initialLatestCreatedAt={latestNotification?.createdAt.toISOString() ?? null} />
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
        <div className="flex items-center border-b border-slate-200 bg-white px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900 sm:px-8">
          <GlobalSearch />
        </div>
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
