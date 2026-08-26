"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CheckSquare,
  FolderKanban,
  KanbanSquare,
  LayoutDashboard,
  ListFilter,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell, type NotificationItem } from "@/components/layout/notification-bell";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: true },
  { href: "/companies", label: "Companies", icon: Building2, adminOnly: true },
  { href: "/contacts", label: "Contacts", icon: Users, adminOnly: true },
  { href: "/lists", label: "Lists", icon: ListFilter, adminOnly: true },
  { href: "/deals", label: "Deals", icon: KanbanSquare, adminOnly: true },
  { href: "/projects", label: "Projects", icon: FolderKanban, adminOnly: false },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, adminOnly: false },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: false },
];

export function Sidebar({
  user,
  myTaskAlertCount = 0,
  notifications = [],
  unreadNotificationCount = 0,
}: {
  user: { name: string; email: string; title: string | null; role: string };
  myTaskAlertCount?: number;
  notifications?: NotificationItem[];
  unreadNotificationCount?: number;
}) {
  const pathname = usePathname();
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === "ADMIN");

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950 sm:flex">
      <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
          G
        </div>
        <span className="text-sm font-semibold text-slate-100">GoTech CRM</span>
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell notifications={notifications} unreadCount={unreadNotificationCount} align="left" />
          <ThemeToggle />
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-950 text-indigo-300"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {item.href === "/tasks" && myTaskAlertCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-semibold text-white">
                  {myTaskAlertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <UserMenu user={user} />
    </aside>
  );
}
