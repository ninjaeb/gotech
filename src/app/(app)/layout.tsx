import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  const endOfToday = new Date();
  endOfToday.setHours(0, 0, 0, 0);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const myTaskAlertCount = await db.task.count({
    where: { assigneeId: user.id, completed: false, dueDate: { lt: endOfToday } },
  });

  return (
    <div className="flex h-full min-h-full">
      <Sidebar user={user} myTaskAlertCount={myTaskAlertCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav user={user} myTaskAlertCount={myTaskAlertCount} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
