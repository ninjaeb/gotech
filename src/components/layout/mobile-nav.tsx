"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  CheckSquare,
  FolderKanban,
  KanbanSquare,
  LayoutDashboard,
  Menu,
  Settings,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/deals", label: "Deals", icon: KanbanSquare },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav({
  user,
  myTaskAlertCount = 0,
}: {
  user: { name: string; email: string; title: string | null };
  myTaskAlertCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
        <ThemeToggle className="ml-auto shrink-0" />
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
              {NAV_ITEMS.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
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
