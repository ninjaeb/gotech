"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CheckSquare,
  FolderKanban,
  KanbanSquare,
  LayoutDashboard,
  ListFilter,
  Menu,
  Settings,
  Trophy,
  Users,
  X,
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

export function MobileNav({
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
  const [open, setOpen] = useState(false);
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === "ADMIN");

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950 px-4 py-3 sm:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="-ml-1.5 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-300 hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">
          G
        </div>
        <span className="truncate text-sm font-semibold text-slate-100">GoTech CRM</span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <NotificationBell notifications={notifications} unreadCount={unreadNotificationCount} />
          <ThemeToggle />
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-slate-950 shadow-xl">
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-800 px-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
                G
              </div>
              <span className="text-sm font-semibold text-slate-100">GoTech CRM</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {navItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Fragment key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
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
                    {item.href === "/settings" && (
                      <Link
                        href="/settings/changelog"
                        onClick={() => setOpen(false)}
                        className={cn(
                          "ml-8 flex items-center rounded-md px-3 py-2 text-xs font-medium transition-colors",
                          pathname === "/settings/changelog"
                            ? "text-indigo-300"
                            : "text-slate-500 hover:text-slate-200",
                        )}
                      >
                        Changelog
                      </Link>
                    )}
                  </Fragment>
                );
              })}
            </nav>
            <UserMenu user={user} />
          </div>
        </div>
      )}
    </>
  );
}
