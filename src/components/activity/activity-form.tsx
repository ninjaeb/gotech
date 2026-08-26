"use client";

import { useRef, useTransition } from "react";
import { addActivity } from "@/app/actions/activities";
import { Button } from "@/components/ui/button";
import { MentionTextarea } from "@/components/activity/mention-textarea";

export function ActivityForm({
  contactId,
  companyId,
  dealId,
  projectId,
  taskId,
  users,
}: {
  contactId?: string;
  companyId?: string;
  dealId?: string;
  projectId?: string;
  taskId?: string;
  users: { id: string; name: string }[];
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
      {taskId && <input type="hidden" name="taskId" value={taskId} />}
      <MentionTextarea
        name="content"
        rows={2}
        users={users}
        placeholder="Log a note, call, or email… (@ to mention someone)"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}
