"use client";

import { useActionState, useEffect, useRef } from "react";
import { addActivity } from "@/app/actions/activities";
import { Button } from "@/components/ui/button";
import { AttachmentField } from "@/components/activity/attachment-field";
import { useActionToast } from "@/components/ui/toast";

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
  const [state, formAction, pending] = useActionState(addActivity, undefined);
  useActionToast(state, "Note added.", { toastErrors: false });

  useEffect(() => {
    if (state && "success" in state) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      {contactId && <input type="hidden" name="contactId" value={contactId} />}
      {companyId && <input type="hidden" name="companyId" value={companyId} />}
      {dealId && <input type="hidden" name="dealId" value={dealId} />}
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      {taskId && <input type="hidden" name="taskId" value={taskId} />}
      <AttachmentField
        name="content"
        rows={2}
        users={users}
        placeholder="Log a note, call, or email… (@ to mention someone)"
      />
      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}
