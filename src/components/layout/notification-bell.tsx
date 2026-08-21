"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  content: string;
  read: boolean;
  createdAt: Date;
  href: string | null;
};

export function NotificationBell({
  notifications,
  unreadCount,
  align = "right",
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  // "right" flushes the dropdown's right edge to the bell — correct when
  // the bell sits near the right edge of a full-width bar (MobileNav).
  // "left" flushes its left edge instead, opening the dropdown into the
  // wide main content area — needed when the bell sits near the right
  // edge of the narrow (w-60) desktop Sidebar, where a right-aligned
  // w-80 dropdown would spill off the left edge of the viewport.
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className={cn(
          "relative inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
          unreadCount > 0
            ? "text-indigo-400 hover:bg-slate-800 hover:text-indigo-300"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
            <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-slate-950">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-30 mt-2 w-80 max-w-[90vw] rounded-lg border border-slate-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900",
            align === "left" ? "left-0" : "right-0",
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-neutral-800">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsRead()}
                className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                {notifications.map((notification) => {
                  const body = (
                    <div className="px-3 py-2.5">
                      <p
                        className={cn(
                          "text-sm",
                          notification.read
                            ? "text-slate-500 dark:text-slate-400"
                            : "font-medium text-slate-800 dark:text-slate-200",
                        )}
                      >
                        {notification.content}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>
                  );
                  return (
                    <li
                      key={notification.id}
                      className={cn(!notification.read && "bg-indigo-50/60 dark:bg-indigo-950/30")}
                    >
                      {notification.href ? (
                        <Link
                          href={notification.href}
                          onClick={() => {
                            setOpen(false);
                            if (!notification.read) markNotificationRead(notification.id);
                          }}
                          className="block hover:bg-slate-50 dark:hover:bg-neutral-800"
                        >
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
