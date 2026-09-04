"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { MailPlus, Sparkles, X } from "lucide-react";
import { draftFollowUp } from "@/app/actions/ai-insights";
import { sendEmailToContact } from "@/app/actions/email-send";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";

const iconLinkClasses =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sky-500 transition-colors hover:bg-sky-50 hover:text-sky-600 dark:text-sky-400 dark:hover:bg-sky-950 dark:hover:text-sky-300";

export function SendEmailButton({
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
  const action = sendEmailToContact.bind(null, contactId);
  const [state, formAction, pending] = useActionState(action, undefined);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
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
    setSubject("");
    setBody("");
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
      setSubject(result.data.subject);
      setBody(result.data.draft);
    });
  }

  const sent = state && "success" in state;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="Send email via CRM"
        aria-label="Send email via CRM"
        className={iconLinkClasses}
      >
        <MailPlus className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Email ${contactName}`}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl dark:bg-neutral-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Email {contactName}
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
                <FieldGroup label="Subject" htmlFor="send-email-subject" required>
                  <Input
                    id="send-email-subject"
                    name="subject"
                    required
                    autoFocus
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                  />
                </FieldGroup>
                <FieldGroup label="Message" htmlFor="send-email-body" required>
                  <Textarea
                    id="send-email-body"
                    name="body"
                    required
                    rows={6}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
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
