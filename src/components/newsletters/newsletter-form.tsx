"use client";

import { useActionState } from "react";
import type { NewsletterFormState } from "@/app/actions/newsletters";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/field";

export function NewsletterForm({
  action,
  lists,
  newsletter,
  submitLabel = "Save draft",
}: {
  action: (prevState: NewsletterFormState, formData: FormData) => Promise<NewsletterFormState>;
  lists: { id: string; name: string }[];
  newsletter?: { subject: string; bodyMarkdown: string; listId: string | null };
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <FieldGroup label="Subject" htmlFor="subject" required>
        <Input id="subject" name="subject" required defaultValue={newsletter?.subject} placeholder="What's new this month" />
      </FieldGroup>

      <FieldGroup label="Audience" htmlFor="listId" required>
        {lists.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No lists yet — create one under Lists first (a static hand-picked set, or the &quot;All contacts with an
            email&quot; dynamic list covers everyone).
          </p>
        ) : (
          <Select id="listId" name="listId" required defaultValue={newsletter?.listId ?? ""}>
            <option value="" disabled>
              Choose a list…
            </option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </Select>
        )}
      </FieldGroup>

      <FieldGroup label="Message" htmlFor="bodyMarkdown" required>
        <Textarea
          id="bodyMarkdown"
          name="bodyMarkdown"
          required
          rows={16}
          defaultValue={newsletter?.bodyMarkdown}
          placeholder={"Hi there,\n\nWrite your newsletter here. **Bold**, _italic_, [links](https://example.com), and\n\n- bullet\n- points\n\nall work."}
          className="font-mono text-sm"
        />
        <p className="mt-1 text-xs text-slate-400">
          Formatted with Markdown — bold/italic, links, headings, and lists all render in the sent email.
        </p>
      </FieldGroup>

      {state?.error && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
