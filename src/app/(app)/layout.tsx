import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { GlobalSearch } from "@/components/layout/global-search";
import type { NotificationItem } from "@/components/layout/notification-bell";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

function notificationHref(notification: {
  // Set directly for a task-description @mention (see notifyTaskMentions);
  // separate from activity.taskId below, which covers a note/email/
  // WhatsApp send logged from the task's own detail page instead.
  taskId: string | null;
  activity: {
    taskId: string | null;
    contactId: string | null;
    companyId: string | null;
    dealId: string | null;
    projectId: string | null;
  } | null;
}): string | null {
  if (notification.taskId) return `/tasks/${notification.taskId}`;
  const activity = notification.activity;
  if (!activity) return null;
  if (activity.taskId) return `/tasks/${activity.taskId}`;
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
        activity: { select: { taskId: true, contactId: true, companyId: true, dealId: true, projectId: true } },
      },
    }),
    db.notification.count({ where: { userId: user.id, read: false } }),
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
