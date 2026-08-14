"use client";

import { useRef, useTransition } from "react";
import { addActivity } from "@/app/actions/activities";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";

export function ActivityForm({
  contactId,
  companyId,
  dealId,
  projectId,
}: {
  contactId?: string;
  companyId?: string;
  dealId?: string;
  projectId?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await addActivity(formData);
          formRef.current?.reset();
        });
      }}
      className="space-y-2"
    >
      {contactId && <input type="hidden" name="contactId" value={contactId} />}
      {companyId && <input type="hidden" name="companyId" value={companyId} />}
      {dealId && <input type="hidden" name="dealId" value={dealId} />}
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      <Textarea
        name="content"
        rows={2}
        required
        placeholder="Log a note, call, or email…"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}
