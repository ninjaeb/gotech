"use client";

import { useState } from "react";
import { useActionState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { SequenceFormState } from "@/app/actions/sequences";
import { Button, buttonClasses } from "@/components/ui/button";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type StepDraft = { key: string; id: string | null; subject: string; body: string; delayDays: number };

let draftKeySeq = 0;
function newDraftKey() {
  draftKeySeq += 1;
  return `draft-${draftKeySeq}`;
}

export function SequenceForm({
  action,
  sequence,
  submitLabel = "Save sequence",
}: {
  action: (prevState: SequenceFormState, formData: FormData) => Promise<SequenceFormState>;
  sequence?: {
    name: string;
    active: boolean;
    steps: { id: string; subject: string; body: string; delayDays: number }[];
  };
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [name, setName] = useState(sequence?.name ?? "");
  const [active, setActive] = useState(sequence?.active ?? true);
  const [rows, setRows] = useState<StepDraft[]>(() =>
    (sequence?.steps ?? [{ id: null, subject: "", body: "", delayDays: 0 }]).map((step) => ({
      key: newDraftKey(),
      ...step,
    })),
  );

  function updateRow(key: string, patch: Partial<StepDraft>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(key: string) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));
  }

  function moveRow(index: number, direction: -1 | 1) {
    setRows((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const stepsJson = JSON.stringify(
    rows.map((row) => ({ id: row.id, subject: row.subject, body: row.body, delayDays: row.delayDays })),
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="active" value={String(active)} />
      <input type="hidden" name="stepsJson" value={stepsJson} />

      <div className="flex flex-wrap items-end gap-3">
        <FieldGroup label="Sequence name" htmlFor="name" required className="min-w-[14rem] flex-1">
          <Input
            id="name"
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New lead follow-up"
          />
        </FieldGroup>
        <label className="mb-2 flex items-center gap-1.5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-neutral-700"
          />
          Active (can be enrolled into)
        </label>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.key} className="rounded-md border border-slate-200 p-3 dark:border-neutral-800">
            <div className="flex items-start gap-2">
              <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-neutral-800 dark:text-slate-400">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  value={row.subject}
                  onChange={(event) => updateRow(row.key, { subject: event.target.value })}
                  placeholder="Subject"
                  aria-label="Step subject"
                />
                <Textarea
                  value={row.body}
                  onChange={(event) => updateRow(row.key, { body: event.target.value })}
                  placeholder="Message"
                  aria-label="Step message"
                  rows={3}
                />
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Send</span>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={row.delayDays}
                    onChange={(event) => updateRow(row.key, { delayDays: Number(event.target.value) || 0 })}
                    aria-label="Days after the previous step"
                    className="w-16"
                  />
                  <span>days after {index === 0 ? "enrollment" : "the previous step"}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveRow(index, -1)}
                  disabled={index === 0}
                  aria-label="Move step up"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-800"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveRow(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label="Move step down"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-800"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                  aria-label="Remove step"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950 dark:hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          setRows((current) => [
            ...current,
            { key: newDraftKey(), id: null, subject: "", body: "", delayDays: 3 },
          ])
        }
        className={cn(buttonClasses("secondary", "sm"))}
      >
        <Plus className="h-4 w-4" />
        Add step
      </button>

      {state?.error && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
