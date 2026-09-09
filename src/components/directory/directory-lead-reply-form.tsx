"use client";

import { useActionState, useEffect, useRef } from "react";
import { replyToDirectoryLead } from "@/app/actions/directory";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";

export function DirectoryLeadReplyForm({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState(replyToDirectoryLead.bind(null, leadId), undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Only clears on an actual send — a failed send leaves the reply in the
  // textarea so the partner doesn't have to retype it.
  useEffect(() => {
    if (state && "success" in state) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <Textarea
        name="body"
        rows={3}
        required
        placeholder="Write a reply — it's emailed to the visitor from Gotka's system address, with your company name as the sender."
      />
      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send reply"}
        </Button>
      </div>
    </form>
  );
}
