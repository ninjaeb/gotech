"use client";

import { useEffect, useState } from "react";
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
    <Card className="divide-y divide-slate-200 dark:divide-neutral-800">
      {conversations.map(({ id, contactId, name, photoUrl, direction, text, createdAt, isUnread }) => (
        <Link
          key={id}
          href={`/whatsapp/${contactId}`}
          className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-neutral-800/60"
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
                <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-600" aria-label="Unread" />
              )}
              <p
                className={cn(
                  "truncate text-sm",
                  isUnread
                    ? "font-medium text-slate-700 dark:text-slate-300"
                    : "text-slate-500 dark:text-slate-400",
                )}
              >
                {direction === "OUTBOUND" && <span className="text-slate-400 dark:text-slate-500">You: </span>}
                {text}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </Card>
  );
}
