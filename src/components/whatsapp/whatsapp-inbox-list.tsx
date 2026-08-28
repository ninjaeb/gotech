"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ContactAvatar } from "@/components/contacts/contact-avatar";
import { relativeToToday } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WhatsAppMessageDirection } from "@/lib/whatsapp";

export type ConversationSummary = {
  id: string;
  contactId: string;
  name: string;
  photoUrl: string | null;
  direction: WhatsAppMessageDirection;
  text: string;
  createdAt: string;
  isUnread: boolean;
};

const POLL_INTERVAL_MS = 2000;

// True when `next` differs from `prev` in a way the UI cares about — lets
// callers skip the setState (and the re-render it would cause) entirely on
// a poll tick where nothing actually changed.
function conversationsChanged(prev: ConversationSummary[], next: ConversationSummary[]): boolean {
  if (prev.length !== next.length) return true;
  return next.some(
    (c, i) => c.id !== prev[i].id || c.isUnread !== prev[i].isUnread || c.text !== prev[i].text,
  );
}

export function WhatsAppInboxList({ initialConversations }: { initialConversations: ConversationSummary[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const unreadCount = conversations.filter((c) => c.isUnread).length;

  // Same fetch-and-merge-into-state pattern as the thread view — see
  // WhatsAppThread for why this replaced an earlier router.refresh()-based
  // approach.
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    async function poll() {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fetch("/api/whatsapp/conversations", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: { conversations: ConversationSummary[] } = await res.json();
        if (cancelled) return;
        setConversations((prev) => (conversationsChanged(prev, data.conversations) ? data.conversations : prev));
      } catch {
        // Transient network hiccup — the next interval retries.
      } finally {
        inFlight = false;
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Flags the browser tab itself while there's something unread on this
  // page, the same "you'd notice this without looking" job the nav
  // sidebar's badge already does — but live, since that badge is only as
  // fresh as the last full page load and this list polls every few seconds.
  // The base title is captured once on mount (not per unreadCount change) so
  // repeatedly prefixing/unprefixing never drifts from the real page title.
  const baseTitleRef = useRef<string | null>(null);
  useEffect(() => {
    baseTitleRef.current = document.title;
    return () => {
      if (baseTitleRef.current !== null) document.title = baseTitleRef.current;
    };
  }, []);
  useEffect(() => {
    const base = baseTitleRef.current ?? document.title;
    document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base;
  }, [unreadCount]);

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="No WhatsApp conversations yet"
        description="Messages you send or receive through a Contact's page will show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-900">
          <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-600" />
          {unreadCount} unread {unreadCount === 1 ? "conversation" : "conversations"}
        </div>
      )}
      <Card className="divide-y divide-slate-200 dark:divide-neutral-800">
        {conversations.map(({ id, contactId, name, photoUrl, direction, text, createdAt, isUnread }) => (
          <Link
            key={id}
            href={`/whatsapp/${contactId}`}
            className={cn(
              "flex items-center gap-3 border-l-4 px-4 py-3.5 transition-colors",
              isUnread
                ? "border-indigo-600 bg-indigo-50/70 hover:bg-indigo-50 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50"
                : "border-transparent hover:bg-slate-50 dark:hover:bg-neutral-800/60",
            )}
          >
            <ContactAvatar photoUrl={photoUrl} name={name} className="h-10 w-10 text-sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "truncate text-sm text-slate-900 dark:text-slate-100",
                    isUnread ? "font-semibold" : "font-medium",
                  )}
                >
                  {name}
                </p>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                  {relativeToToday(createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {isUnread && (
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-600" aria-label="Unread" />
                )}
                <p
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    isUnread
                      ? "font-semibold text-slate-800 dark:text-slate-200"
                      : "text-slate-500 dark:text-slate-400",
                  )}
                >
                  {direction === "OUTBOUND" && <span className="text-slate-400 dark:text-slate-500">You: </span>}
                  {text}
                </p>
                {isUnread && (
                  <span className="ml-auto shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    New
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </Card>
    </div>
  );
}
