"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { MessageCirclePlus, Sparkles, X } from "lucide-react";
import { draftFollowUp } from "@/app/actions/ai-insights";
import { sendWhatsAppToContact } from "@/app/actions/whatsapp-send";
import { Button } from "@/components/ui/button";
import { FieldGroup, Textarea } from "@/components/ui/field";

const iconLinkClasses =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-neutral-800 dark:hover:text-slate-200";

export function SendWhatsAppButton({
  contactId,
  contactName,
  taskId,
}: {
  contactId: string;
  contactName: string;
  // When sent from a Task's own detail page, logs the resulting activity
  // to that task too, not just the contact.
  taskId?: string;
}) {
  const [open, setOpen] = useState(false);
  const action = sendWhatsAppToContact.bind(null, contactId);
  const [state, formAction, pending] = useActionState(action, undefined);

  const [message, setMessage] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftPending, startDraftTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function handleOpen() {
    setMessage("");
    setDraftError(null);
    setOpen(true);
  }

  function handleDraft() {
    setDraftError(null);
    startDraftTransition(async () => {
      const result = await draftFollowUp({ contactId });
      if (result.status === "error") {
        setDraftError(result.message);
        return;
      }
      setMessage(result.data.draft);
    });
  }

  const sent = state && "success" in state;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="Send WhatsApp message via CRM"
        aria-label="Send WhatsApp message via CRM"
        className={iconLinkClasses}
      >
        <MessageCirclePlus className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`WhatsApp ${contactName}`}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl dark:bg-neutral-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                WhatsApp {contactName}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {sent ? (
              <p className="rounded-md bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                Sent!
              </p>
            ) : (
              <form action={formAction} className="space-y-3">
                {taskId && <input type="hidden" name="taskId" value={taskId} />}
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={handleDraft} disabled={draftPending}>
                    <Sparkles className="h-4 w-4" />
                    {draftPending ? "Drafting…" : "Draft with AI"}
                  </Button>
                </div>
                {draftError && <p className="text-sm text-rose-600 dark:text-rose-400">{draftError}</p>}
                <FieldGroup label="Message" htmlFor="send-whatsapp-message" required>
                  <Textarea
                    id="send-whatsapp-message"
                    name="message"
                    required
                    rows={5}
                    autoFocus
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </FieldGroup>
                {state && "error" in state && (
                  <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? "Sending…" : "Send"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
