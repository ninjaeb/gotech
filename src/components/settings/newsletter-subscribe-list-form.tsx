"use client";

import { useActionState } from "react";
import { updateNewsletterSubscribeList } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";
import { useActionToast } from "@/components/ui/toast";

export function NewsletterSubscribeListForm({
  currentListId,
  lists,
}: {
  currentListId: string | null;
  lists: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(updateNewsletterSubscribeList, undefined);
  useActionToast(state, "Saved.", { toastErrors: false });

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-48">
        <Label htmlFor="subscribeListId">Adds subscribers to</Label>
        {/* Keyed on currentListId so a successful save (which revalidates the
        page and passes a new currentListId prop down) remounts the <select>
        instead of leaving its defaultValue-driven display stale — defaultValue
        only takes effect on mount, not on prop updates to an already-mounted
        uncontrolled element. */}
        <Select key={currentListId ?? "none"} id="subscribeListId" name="listId" defaultValue={currentListId ?? ""}>
          <option value="">Off — no list selected</option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      {lists.length === 0 && (
        <p className="w-full text-xs text-slate-400">
          No static lists yet — create one from <span className="font-medium">Lists</span> first.
        </p>
      )}
      {state && "error" in state && <p className="w-full text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}
    </form>
  );
}
