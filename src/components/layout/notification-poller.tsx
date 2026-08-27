"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type PolledNotification = { id: string; content: string; createdAt: string; href: string | null };

const POLL_INTERVAL_MS = 25_000;

// Renders nothing — a background poller for desktop/browser notifications.
// The bell dropdown itself is server-rendered per page load and doesn't
// need this; this exists only to catch notifications that arrive *while*
// the app is already open, including when the tab isn't focused.
export function NotificationPoller({ initialLatestCreatedAt }: { initialLatestCreatedAt: string | null }) {
  const router = useRouter();
  const cursorRef = useRef(initialLatestCreatedAt ?? new Date(0).toISOString());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/notifications/poll?since=${encodeURIComponent(cursorRef.current)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: { notifications: PolledNotification[] } = await res.json();
        if (cancelled || data.notifications.length === 0) return;

        cursorRef.current = data.notifications[data.notifications.length - 1].createdAt;

        const tabUnfocused = document.hidden || !document.hasFocus();
        const canNotify = "Notification" in window && Notification.permission === "granted";
        if (tabUnfocused && canNotify) {
          fireDesktopNotifications(data.notifications, router);
        }

        router.refresh();
      } catch {
        // Transient network or session hiccup — the next interval retries.
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);

  return null;
}

function fireDesktopNotifications(items: PolledNotification[], router: ReturnType<typeof useRouter>) {
  // A burst of individual OS notifications is more annoying than useful —
  // group anything beyond a few into one summary instead.
  if (items.length > 3) {
    const notification = new Notification("GoTech CRM", {
      body: `You have ${items.length} new notifications.`,
    });
    notification.onclick = () => {
      window.focus();
      router.push("/");
      notification.close();
    };
    return;
  }

  for (const item of items) {
    const notification = new Notification("GoTech CRM", { body: item.content, tag: item.id });
    notification.onclick = () => {
      window.focus();
      if (item.href) router.push(item.href);
      notification.close();
    };
  }
}
