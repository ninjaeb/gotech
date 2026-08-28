"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, CheckCheck, Send } from "lucide-react";
import { sendWhatsAppToContact, markWhatsAppThreadRead } from "@/app/actions/whatsapp-send";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WhatsAppMessageDirection } from "@/lib/whatsapp";

type MessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED" | null;

export type ThreadMessage = {
  id: string;
  direction: WhatsAppMessageDirection;
  text: string;
  createdAt: string;
  status: MessageStatus;
};

const POLL_INTERVAL_MS = 2000;

function StatusTicks({ status }: { status: MessageStatus }) {
  if (status === "READ") return <CheckCheck className="h-3.5 w-3.5 text-sky-300" aria-label="Read" />;
  if (status === "DELIVERED") return <CheckCheck className="h-3.5 w-3.5" aria-label="Delivered" />;
  if (status === "FAILED") return <AlertCircle className="h-3.5 w-3.5 text-rose-300" aria-label="Failed to send" />;
  if (status === "SENT") return <Check className="h-3.5 w-3.5" aria-label="Sent" />;
  return null;
}

// True when `next` differs from `prev` in a way the UI cares about (a new
// message, or a status change on an existing one) — lets callers skip the
// setState entirely on a poll tick where nothing changed, so React never
// re-renders (and never risks disturbing focus/scroll) for a no-op fetch.
function messagesChanged(prev: ThreadMessage[], next: ThreadMessage[]): boolean {
  if (prev.length !== next.length) return true;
  return next.some((message, i) => message.id !== prev[i].id || message.status !== prev[i].status);
}

export function WhatsAppThread({
  contactId,
  contactName,
  initialMessages,
  hasWhatsAppAccount,
  contactPhone,
}: {
  contactId: string;
  contactName: string;
  initialMessages: ThreadMessage[];
  hasWhatsAppAccount: boolean;
  contactPhone: string | null;
}) {
  const action = sendWhatsAppToContact.bind(null, contactId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Polls a small JSON endpoint and merges the result into local state,
  // rather than the earlier router.refresh() approach — that re-rendered
  // the whole Server Component tree on every tick, which could visibly
  // disturb the composer below even though its value itself survived.
  // Merging into state here touches only this component, so the composer
  // (a sibling piece of state) is never in the blast radius at all.
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    async function poll() {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/whatsapp/thread/${contactId}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: { messages: ThreadMessage[] } = await res.json();
        if (cancelled) return;
        setMessages((prev) => (messagesChanged(prev, data.messages) ? data.messages : prev));
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
  }, [contactId]);

  // Scroll to the newest message on mount, and again whenever the thread
  // grows — always lands on the latest line rather than wherever the
  // previous scroll position happened to be.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Marks the thread read on mount and again every time it grows — an
  // open thread should stay "read" live as replies arrive on screen, not
  // just at the moment it was first opened. Fire-and-forget: nothing in
  // the UI depends on this succeeding.
  useEffect(() => {
    if (messages.length === 0) return;
    markWhatsAppThreadRead(contactId).catch(() => {});
  }, [contactId, messages.length]);

  // Clears the composer and appends the sent message the instant a send
  // succeeds, rather than waiting for the next poll tick to pick it up —
  // your own message should never feel delayed. Doing this from a plain
  // effect would trip react-hooks/set-state-in-effect, so this follows
  // React's "adjust state during render" pattern instead, same shape as
  // SendWhatsAppButton's post-success reset.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state && "success" in state) {
      setText("");
      const sent = state.message;
      setMessages((prev) =>
        prev.some((m) => m.id === sent.id)
          ? prev
          : [...prev, { id: sent.id, direction: "OUTBOUND", text: sent.text, createdAt: sent.createdAt, status: "SENT" }],
      );
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  const canSend = hasWhatsAppAccount && !!contactPhone;
  // Precomputed rather than tracked via a mutable variable while mapping in
  // JSX below — each day is derived independently from its own index, no
  // reassignment across iterations.
  const rows = messages.map((message, index) => ({
    message,
    showDayDivider: index === 0 || formatDate(message.createdAt) !== formatDate(messages[index - 1].createdAt),
  }));

  return (
    <Card className="flex flex-col">
      <div className="space-y-1 rounded-t-lg bg-slate-50/60 px-4 py-4 dark:bg-neutral-950/40 sm:px-6">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
            No messages yet — say hello below.
          </p>
        )}
        {rows.map(({ message, showDayDivider }) => {
          const outbound = message.direction === "OUTBOUND";
          return (
            <div key={message.id}>
              {showDayDivider && (
                <div className="my-3 flex justify-center">
                  <span
                    data-testid="day-divider"
                    className="rounded-full bg-slate-200/70 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-neutral-800 dark:text-slate-400"
                  >
                    {formatDate(message.createdAt)}
                  </span>
                </div>
              )}
              <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                    outbound
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-slate-800 dark:bg-neutral-800 dark:text-slate-100",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  <div
                    className={cn(
                      "mt-1 flex items-center justify-end gap-1 text-[11px]",
                      outbound ? "text-emerald-100" : "text-slate-400 dark:text-slate-500",
                    )}
                  >
                    {formatTime(message.createdAt)}
                    {outbound && <StatusTicks status={message.status} />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {canSend ? (
        <form
          ref={formRef}
          action={formAction}
          className="sticky bottom-0 rounded-b-lg border-t border-slate-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 sm:px-6"
        >
          <div className="flex items-end gap-2">
            <Textarea
              name="message"
              required
              rows={1}
              placeholder={`Message ${contactName}…`}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
              className="max-h-32 flex-1 resize-none"
            />
            <Button type="submit" disabled={pending || !text.trim()}>
              <Send className="h-4 w-4" />
              {pending ? "Sending…" : "Send"}
            </Button>
          </div>
          {state && "error" in state && (
            <p className="mt-1.5 text-sm text-rose-600 dark:text-rose-400">{state.error}</p>
          )}
        </form>
      ) : (
        <p className="sticky bottom-0 rounded-b-lg border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-slate-400 sm:px-6">
          {hasWhatsAppAccount
            ? "Add a phone number to this contact to reply from here."
            : "Connect WhatsApp Business in Settings to reply from here."}
        </p>
      )}
    </Card>
  );
}
