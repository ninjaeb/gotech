"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CheckSquare,
  FolderKanban,
  Handshake,
  KanbanSquare,
  LayoutDashboard,
  ListFilter,
  Mail,
  Menu,
  MessageCircle,
  Settings,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SETTINGS_SUB_ITEMS } from "@/lib/settings-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell, type NotificationItem } from "@/components/layout/notification-bell";

// Same NAV_ITEMS + iconColor convention as sidebar.tsx (desktop) — see the
// comment there for why each color was picked, and for what `roles: null`
// vs an explicit allowlist means. Kept in sync manually since this file
// already duplicates sidebar.tsx's nav structure rather than sharing it.
const NAV_ITEMS = [
  { href: "/system", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "SALES"], iconColor: "text-slate-400" },
  { href: "/system/companies", label: "Companies", icon: Building2, roles: ["ADMIN", "SALES"], iconColor: "text-sky-400" },
  { href: "/system/contacts", label: "Contacts", icon: Users, roles: ["ADMIN", "SALES"], iconColor: "text-cyan-400" },
  { href: "/system/lists", label: "Lists", icon: ListFilter, roles: ["ADMIN"], iconColor: "text-violet-400" },
  { href: "/system/deals", label: "Deals", icon: KanbanSquare, roles: ["ADMIN", "SALES"], iconColor: "text-fuchsia-400" },
  { href: "/system/whatsapp", label: "WhatsApp", icon: MessageCircle, roles: ["ADMIN"], iconColor: "text-emerald-400" },
  { href: "/system/newsletters", label: "Newsletters", icon: Mail, roles: ["ADMIN"], iconColor: "text-blue-400" },
  { href: "/system/projects", label: "Projects", icon: FolderKanban, roles: null, iconColor: "text-orange-400" },
  { href: "/system/tasks", label: "Tasks", icon: CheckSquare, roles: null, iconColor: "text-rose-400" },
  { href: "/system/leaderboard", label: "Leaderboard", icon: Trophy, roles: ["ADMIN", "SALES"], iconColor: "text-amber-400" },
  { href: "/system/referrals", label: "Referrals", icon: Handshake, roles: ["ADMIN"], iconColor: "text-teal-400" },
  { href: "/system/settings", label: "Settings", icon: Settings, roles: null, iconColor: "text-slate-400" },
];

export function MobileNav({
  user,
  myTaskAlertCount = 0,
  whatsappUnreadCount = 0,
  notifications = [],
  unreadNotificationCount = 0,
}: {
  user: { name: string; email: string; title: string | null; role: string };
  myTaskAlertCount?: number;
  whatsappUnreadCount?: number;
  notifications?: NotificationItem[];
  unreadNotificationCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

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
        <img src="/icon-192.png" alt="" className="h-6 w-6 shrink-0" />
        <span className="truncate text-sm font-semibold text-slate-100">Gotka CRM</span>
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
              <img src="/icon-192.png" alt="" className="h-7 w-7 shrink-0" />
              <span className="text-sm font-semibold text-slate-100">Gotka CRM</span>
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
                  item.href === "/system"
                    ? pathname === "/system"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                const badgeCount =
                  item.href === "/system/tasks" ? myTaskAlertCount : item.href === "/system/whatsapp" ? whatsappUnreadCount : 0;
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
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-indigo-300" : item.iconColor)} />
                      {item.label}
                      {badgeCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-semibold text-white">
                          {badgeCount}
                        </span>
                      )}
                    </Link>
                    {item.href === "/system/settings" &&
                      SETTINGS_SUB_ITEMS.filter((sub) => !sub.adminOnly || user.role === "ADMIN").map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "ml-8 flex items-center rounded-md px-3 py-2 text-xs font-medium transition-colors",
                            pathname === sub.href ? "text-indigo-300" : "text-slate-500 hover:text-slate-200",
                          )}
                        >
                          {sub.label}
                        </Link>
                      ))}
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
