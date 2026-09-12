"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { updatePipelineTaskTemplate } from "@/app/actions/pipelines";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { useActionToast } from "@/components/ui/toast";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_TYPES, TASK_TYPE_LABELS } from "@/lib/labels";
import type { TaskPriority, TaskType } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

type ItemDraft = {
  key: string;
  id: string | null;
  title: string;
  type: TaskType;
  priority: TaskPriority;
  daysFromNow: string; // "" = no standard due date
  assigneeIds: string[];
  followerIds: string[];
};

type TemplateItemInput = {
  id: string;
  title: string;
  type: TaskType;
  priority: TaskPriority;
  daysFromNow: number | null;
  assignees: { userId: string }[];
  followers: { userId: string }[];
};

let draftKeySeq = 0;
function newDraftKey() {
  draftKeySeq += 1;
  return `draft-${draftKeySeq}`;
}

function blankRow(): ItemDraft {
  return { key: newDraftKey(), id: null, title: "", type: "OTHER", priority: "MEDIUM", daysFromNow: "", assigneeIds: [], followerIds: [] };
}

export function PipelineTaskTemplateForm({
  pipelineId,
  items,
  users,
}: {
  pipelineId: string;
  items: TemplateItemInput[];
  users: { id: string; name: string }[];
}) {
  const action = updatePipelineTaskTemplate.bind(null, pipelineId);
  const [state, formAction, pending] = useActionState(action, undefined);
  useActionToast(state, "Task checklist saved.", { toastErrors: false });
  const userOptions = users.map((user) => ({ value: user.id, label: user.name }));
  const [rows, setRows] = useState<ItemDraft[]>(() =>
    items.length > 0
      ? items.map((item) => ({
          key: newDraftKey(),
          id: item.id,
          title: item.title,
          type: item.type,
          priority: item.priority,
          daysFromNow: item.daysFromNow === null ? "" : String(item.daysFromNow),
          assigneeIds: item.assignees.map((a) => a.userId),
          followerIds: item.followers.map((f) => f.userId),
        }))
      : [],
  );

  // A successful submit runs through React's own post-action form-reset
  // (it replays the browser's native reset-after-submit behavior), which
  // snaps every <select> in the form back to its first <option> —
  // bypassing React's value tracking, since nothing about `rows` itself
  // changed. Text/number inputs don't show this because React re-syncs
  // those directly; selects don't get the same treatment. That reset runs
  // synchronously as part of finishing the action, before passive effects,
  // so — unlike most state derived from a prop/state change — this can't
  // be done during render (it would just get reset again right after);
  // it has to happen in an effect, after the reset already ran. Bumping
  // this into each row's <select> key then forces a fresh DOM node whose
  // initial value is the (already-correct) current one.
  const seenStateRef = useRef(state);
  const [selectGen, setSelectGen] = useState(0);
  useEffect(() => {
    if (state === seenStateRef.current) return;
    seenStateRef.current = state;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- must run after React's post-action form.reset(), which a render-phase update can't wait for (see comment above)
    if (state && "success" in state) setSelectGen((gen) => gen + 1);
  }, [state]);

  function updateRow(key: string, patch: Partial<ItemDraft>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
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

  const itemsJson = JSON.stringify(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      priority: row.priority,
      daysFromNow: row.daysFromNow.trim() === "" ? null : Number(row.daysFromNow),
      assigneeIds: row.assigneeIds,
      followerIds: row.followerIds,
    })),
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="itemsJson" value={itemsJson} />

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No standard tasks yet — every deal on this pipeline starts with an empty task list.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={row.key} className="space-y-2 rounded-md border border-slate-200 p-2.5 dark:border-neutral-800">
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_9rem_7rem_8rem_auto]">
                <Input
                  value={row.title}
                  onChange={(event) => updateRow(row.key, { title: event.target.value })}
                  placeholder="Task title"
                  aria-label="Task title"
                />
                <Select
                  key={`type-${row.key}-${selectGen}`}
                  value={row.type}
                  onChange={(event) => updateRow(row.key, { type: event.target.value as TaskType })}
                  aria-label="Task type"
                >
                  {TASK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {TASK_TYPE_LABELS[type]}
                    </option>
                  ))}
                </Select>
                <Select
                  key={`priority-${row.key}-${selectGen}`}
                  value={row.priority}
                  onChange={(event) => updateRow(row.key, { priority: event.target.value as TaskPriority })}
                  aria-label="Task priority"
                >
                  {TASK_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {TASK_PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </Select>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={row.daysFromNow}
                    onChange={(event) => updateRow(row.key, { daysFromNow: event.target.value })}
                    placeholder="No due date"
                    aria-label="Standard duration in days"
                  />
                  <span className="shrink-0 text-xs text-slate-400">days</span>
                </div>
                <div className="flex items-center gap-1 justify-self-end">
                  <button
                    type="button"
                    onClick={() => moveRow(index, -1)}
                    disabled={index === 0}
                    aria-label="Move task up"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-800"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRow(index, 1)}
                    disabled={index === rows.length - 1}
                    aria-label="Move task down"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-800"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    aria-label="Remove task"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-950 dark:hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {users.length > 0 && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`${row.key}-assignees`}>Assignees</Label>
                    <MultiCombobox
                      id={`${row.key}-assignees`}
                      name="assigneeIds"
                      options={userOptions}
                      value={row.assigneeIds}
                      onValueChange={(value) => updateRow(row.key, { assigneeIds: value })}
                      placeholder="Who's responsible…"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${row.key}-followers`}>Followers</Label>
                    <MultiCombobox
                      id={`${row.key}-followers`}
                      name="followerIds"
                      options={userOptions}
                      value={row.followerIds}
                      onValueChange={(value) => updateRow(row.key, { followerIds: value })}
                      placeholder="Who wants visibility…"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={() => setRows((current) => [...current, blankRow()])} className={cn(buttonClasses("secondary", "sm"))}>
        <Plus className="h-4 w-4" />
        Add task
      </button>

      {state && "error" in state && <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save task checklist"}
        </Button>
      </div>
    </form>
  );
}
